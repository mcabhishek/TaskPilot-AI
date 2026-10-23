import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/database.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';
import { evaluateWorkflows } from '../workflows/workflowEngine.js';

export const tasksRouter = Router();
tasksRouter.use(authMiddleware);

// Get all tasks for the logged in user with filters
tasksRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  const { status, priority, projectId, search, overdue } = req.query;

  let query = `
    SELECT t.*, p.name as project_name, p.color as project_color,
           (SELECT COUNT(*) FROM subtasks WHERE task_id = t.id) as subtask_count,
           (SELECT COUNT(*) FROM subtasks WHERE task_id = t.id AND is_completed = 1) as completed_subtask_count
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.user_id = ?
  `;
  const params: any[] = [userId];

  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }
  if (priority) {
    query += ' AND t.priority = ?';
    params.push(priority);
  }
  if (projectId) {
    query += ' AND t.project_id = ?';
    params.push(projectId);
  }
  if (search) {
    query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (overdue === 'true') {
    query += " AND t.due_date < datetime('now') AND t.status != 'DONE'";
  }

  query += " ORDER BY CASE t.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END, t.due_date ASC, t.created_at DESC";

  try {
    const tasks = db.prepare(query).all(...params) as any[];
    // Parse tags JSON
    const parsed = tasks.map(t => {
      let parsedTags = [];
      try { parsedTags = JSON.parse(t.tags || '[]'); } catch { parsedTags = []; }
      return { ...t, tags: parsedTags };
    });
    res.json(parsed);
  } catch (err: any) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

// Get task details with subtasks
tasksRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;

  try {
    const task = db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = ? AND t.user_id = ?
    `).get(id, userId) as any;

    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    const subtasks = db.prepare(`
      SELECT * FROM subtasks WHERE task_id = ? ORDER BY order_index ASC, created_at ASC
    `).all(id);

    let parsedTags = [];
    try { parsedTags = JSON.parse(task.tags || '[]'); } catch { parsedTags = []; }

    res.json({ ...task, tags: parsedTags, subtasks });
  } catch (err) {
    console.error('Error fetching task details:', err);
    res.status(500).json({ error: 'Failed to fetch task.' });
  }
});

// Create task
tasksRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { title, description, status, priority, due_date, start_date, project_id, estimated_duration, tags, subtasks } = req.body;

  if (!title || !title.trim()) {
    res.status(400).json({ error: 'Task title is required.' });
    return;
  }

  const taskId = uuidv4();
  const taskStatus = status || 'TODO';
  const taskPriority = priority || 'MEDIUM';
  const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
  const completedAt = taskStatus === 'DONE' ? new Date().toISOString() : null;

  try {
    const insertTransaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO tasks (id, user_id, project_id, title, description, status, priority, start_date, due_date, estimated_duration, completed_at, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        taskId,
        userId,
        project_id || null,
        title.trim(),
        description || '',
        taskStatus,
        taskPriority,
        start_date || null,
        due_date || null,
        estimated_duration ? Number(estimated_duration) : null,
        completedAt,
        tagsJson
      );

      if (Array.isArray(subtasks) && subtasks.length > 0) {
        const insertSubtask = db.prepare(`
          INSERT INTO subtasks (id, task_id, title, is_completed, order_index)
          VALUES (?, ?, ?, ?, ?)
        `);
        subtasks.forEach((sub: any, idx: number) => {
          insertSubtask.run(uuidv4(), taskId, typeof sub === 'string' ? sub : sub.title, sub.is_completed ? 1 : 0, idx);
        });
      }

      // Record activity event
      db.prepare(`
        INSERT INTO activity_events (id, user_id, entity_type, entity_id, action, details)
        VALUES (?, ?, 'TASK', ?, 'CREATED', ?)
      `).run(uuidv4(), userId, taskId, `Created task: ${title.trim()}`);
    });

    insertTransaction();

    const created = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as any;

    // Trigger workflow
    evaluateWorkflows({
      userId,
      triggerType: 'TASK_CREATED',
      task: created,
    });

    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task.' });
  }
});

// Update task
tasksRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { title, description, status, priority, due_date, start_date, project_id, estimated_duration, tags } = req.body;

  try {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!existing) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    const newStatus = status !== undefined ? status : existing.status;
    const completedAt = (newStatus === 'DONE' && existing.status !== 'DONE') 
      ? new Date().toISOString() 
      : (newStatus !== 'DONE' ? null : existing.completed_at);

    const tagsJson = tags !== undefined ? JSON.stringify(tags) : existing.tags;

    db.prepare(`
      UPDATE tasks
      SET title = ?, description = ?, status = ?, priority = ?, start_date = ?, due_date = ?, project_id = ?, estimated_duration = ?, completed_at = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      title !== undefined ? title.trim() : existing.title,
      description !== undefined ? description : existing.description,
      newStatus,
      priority !== undefined ? priority : existing.priority,
      start_date !== undefined ? start_date : existing.start_date,
      due_date !== undefined ? due_date : existing.due_date,
      project_id !== undefined ? project_id : existing.project_id,
      estimated_duration !== undefined ? Number(estimated_duration) : existing.estimated_duration,
      completedAt,
      tagsJson,
      id,
      userId
    );

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;

    // Record activity
    db.prepare(`
      INSERT INTO activity_events (id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, 'TASK', ?, ?, ?)
    `).run(
      uuidv4(),
      userId,
      id,
      newStatus === 'DONE' ? 'COMPLETED' : 'UPDATED',
      `Updated task: ${updated.title} (Status: ${newStatus})`
    );

    if (newStatus !== existing.status) {
      evaluateWorkflows({
        userId,
        triggerType: 'STATUS_CHANGED',
        task: updated,
      });
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

// Delete task
tasksRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!existing) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(id, userId);

    db.prepare(`
      INSERT INTO activity_events (id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, 'TASK', ?, 'DELETED', ?)
    `).run(uuidv4(), userId, id, `Deleted task: ${existing.title}`);

    res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

// Toggle or add subtask
tasksRouter.post('/:id/subtasks', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { title } = req.body;

  if (!title) {
    res.status(400).json({ error: 'Subtask title required.' });
    return;
  }

  try {
    const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(id, userId);
    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    const subId = uuidv4();
    db.prepare(`
      INSERT INTO subtasks (id, task_id, title, is_completed)
      VALUES (?, ?, ?, 0)
    `).run(subId, id, title.trim());

    const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(subId);
    res.status(201).json(subtask);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add subtask.' });
  }
});

tasksRouter.put('/:id/subtasks/:subtaskId', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { id, subtaskId } = req.params;
  const { is_completed, title } = req.body;

  try {
    const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(id, userId);
    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    if (is_completed !== undefined) {
      db.prepare('UPDATE subtasks SET is_completed = ? WHERE id = ? AND task_id = ?').run(is_completed ? 1 : 0, subtaskId, id);
    }
    if (title !== undefined) {
      db.prepare('UPDATE subtasks SET title = ? WHERE id = ? AND task_id = ?').run(title.trim(), subtaskId, id);
    }

    const updated = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(subtaskId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update subtask.' });
  }
});

tasksRouter.delete('/:id/subtasks/:subtaskId', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { id, subtaskId } = req.params;

  try {
    const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(id, userId);
    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    db.prepare('DELETE FROM subtasks WHERE id = ? AND task_id = ?').run(subtaskId, id);
    res.json({ message: 'Subtask deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete subtask.' });
  }
});
