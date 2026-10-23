import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/database.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';
import { TasksService } from './tasksService.js';

export const tasksRouter = Router();
tasksRouter.use(authMiddleware);

// Get all tasks for the logged in user with filters
tasksRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { status, priority, projectId, search, overdue, limit } = req.query;

  try {
    const tasks = TasksService.listTasks({
      userId,
      status: status as string,
      priority: priority as string,
      projectId: projectId as string,
      search: search as string,
      overdue: overdue as string,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(tasks);
  } catch (err: any) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

// Get task details with subtasks
tasksRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  try {
    const task = TasksService.getTaskById(userId, id);
    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }
    res.json(task);
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

  try {
    const created = TasksService.createTask({
      userId,
      title,
      description,
      status,
      priority,
      due_date,
      start_date,
      project_id,
      estimated_duration,
      tags,
      subtasks,
    });
    res.status(201).json(created);
  } catch (err: any) {
    console.error('Error creating task:', err);
    if (err.message && err.message.includes('Project not found')) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message || 'Failed to create task.' });
  }
});

// Update task
tasksRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { title, description, status, priority, due_date, start_date, project_id, estimated_duration, tags } = req.body;

  try {
    const updated = TasksService.updateTask({
      userId,
      taskId: id,
      title,
      description,
      status,
      priority,
      due_date,
      start_date,
      project_id,
      estimated_duration,
      tags,
    });
    res.json(updated);
  } catch (err: any) {
    console.error('Error updating task:', err);
    if (err.message && err.message.includes('Task not found')) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }
    if (err.message && err.message.includes('Project not found')) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

// Delete task
tasksRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  try {
    const result = TasksService.deleteTask(userId, id);
    res.json(result);
  } catch (err: any) {
    console.error('Error deleting task:', err);
    if (err.message && err.message.includes('Task not found')) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

// Add subtask
tasksRouter.post('/:id/subtasks', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { title } = req.body;

  if (!title || !title.trim()) {
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

// Update subtask
tasksRouter.put('/:id/subtasks/:subtaskId', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const subtaskId = Array.isArray(req.params.subtaskId) ? req.params.subtaskId[0] : req.params.subtaskId;
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

// Delete subtask
tasksRouter.delete('/:id/subtasks/:subtaskId', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const subtaskId = Array.isArray(req.params.subtaskId) ? req.params.subtaskId[0] : req.params.subtaskId;

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
