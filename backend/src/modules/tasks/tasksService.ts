import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/database.js';
import { evaluateWorkflows } from '../workflows/workflowEngine.js';

export interface CreateTaskInput {
  userId: string;
  title: string;
  description?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  due_date?: string | null;
  start_date?: string | null;
  project_id?: string | null;
  estimated_duration?: number | null;
  tags?: string[];
  subtasks?: Array<string | { title: string; is_completed?: boolean }>;
}

export interface UpdateTaskInput {
  userId: string;
  taskId: string;
  title?: string;
  description?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  due_date?: string | null;
  start_date?: string | null;
  project_id?: string | null;
  estimated_duration?: number | null;
  tags?: string[];
}

export interface ListTasksInput {
  userId: string;
  status?: string;
  priority?: string;
  projectId?: string;
  search?: string;
  overdue?: boolean | string;
  limit?: number;
}

export class TasksService {
  /**
   * List tasks for a given authenticated user with filters and safety limit.
   */
  static listTasks(input: ListTasksInput) {
    const { userId, status, priority, projectId, search, overdue, limit } = input;
    const safeLimit = limit && Number.isInteger(limit) && limit > 0 && limit <= 200 ? limit : 100;

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
    if (search && search.trim()) {
      query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }
    if (overdue === true || overdue === 'true') {
      query += " AND t.due_date < datetime('now') AND t.status != 'DONE'";
    }

    query += " ORDER BY CASE t.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END, t.due_date ASC, t.created_at DESC";
    query += ` LIMIT ${safeLimit}`;

    const tasks = db.prepare(query).all(...params) as any[];
    return tasks.map(t => {
      let parsedTags = [];
      try {
        parsedTags = JSON.parse(t.tags || '[]');
      } catch {
        parsedTags = [];
      }
      return { ...t, tags: parsedTags };
    });
  }

  /**
   * Get single task by ID enforcing user ownership.
   */
  static getTaskById(userId: string, taskId: string) {
    const task = db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = ? AND t.user_id = ?
    `).get(taskId, userId) as any;

    if (!task) return null;

    const subtasks = db.prepare(`
      SELECT * FROM subtasks WHERE task_id = ? ORDER BY order_index ASC, created_at ASC
    `).all(taskId);

    let parsedTags = [];
    try {
      parsedTags = JSON.parse(task.tags || '[]');
    } catch {
      parsedTags = [];
    }

    return { ...task, tags: parsedTags, subtasks };
  }

  /**
   * Create a new task with subtasks and workflow evaluation.
   */
  static createTask(input: CreateTaskInput) {
    const {
      userId,
      title,
      description = '',
      status = 'TODO',
      priority = 'MEDIUM',
      due_date = null,
      start_date = null,
      project_id = null,
      estimated_duration = null,
      tags = [],
      subtasks = [],
    } = input;

    if (!title || !title.trim()) {
      throw new Error('Task title is required.');
    }

    // Validate project ownership if project_id is provided
    if (project_id) {
      const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(project_id, userId);
      if (!project) {
        throw new Error('Project not found or unauthorized.');
      }
    }

    const taskId = uuidv4();
    const taskStatus = status;
    const taskPriority = priority;
    const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
    const completedAt = taskStatus === 'DONE' ? new Date().toISOString() : null;

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
          const subTitle = typeof sub === 'string' ? sub : sub.title;
          const isComp = typeof sub === 'object' && sub.is_completed ? 1 : 0;
          if (subTitle && subTitle.trim()) {
            insertSubtask.run(uuidv4(), taskId, subTitle.trim(), isComp, idx);
          }
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

    return created;
  }

  /**
   * Update task fields.
   */
  static updateTask(input: UpdateTaskInput) {
    const { userId, taskId, title, description, status, priority, start_date, due_date, project_id, estimated_duration, tags } = input;

    const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(taskId, userId) as any;
    if (!existing) {
      throw new Error('Task not found or access denied.');
    }

    if (project_id) {
      const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(project_id, userId);
      if (!project) {
        throw new Error('Project not found or unauthorized.');
      }
    }

    const newStatus = status !== undefined ? status : existing.status;
    const completedAt =
      newStatus === 'DONE' && existing.status !== 'DONE'
        ? new Date().toISOString()
        : newStatus !== 'DONE'
        ? null
        : existing.completed_at;

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
      taskId,
      userId
    );

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as any;

    // Record activity
    db.prepare(`
      INSERT INTO activity_events (id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, 'TASK', ?, ?, ?)
    `).run(
      uuidv4(),
      userId,
      taskId,
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

    return updated;
  }

  /**
   * Complete task directly.
   */
  static completeTask(userId: string, taskId: string) {
    return TasksService.updateTask({
      userId,
      taskId,
      status: 'DONE',
    });
  }

  /**
   * Delete task directly.
   */
  static deleteTask(userId: string, taskId: string) {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(taskId, userId) as any;
    if (!existing) {
      throw new Error('Task not found or access denied.');
    }

    db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(taskId, userId);

    db.prepare(`
      INSERT INTO activity_events (id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, 'TASK', ?, 'DELETED', ?)
    `).run(uuidv4(), userId, taskId, `Deleted task: ${existing.title}`);

    return { success: true, message: 'Task deleted successfully.' };
  }
}
