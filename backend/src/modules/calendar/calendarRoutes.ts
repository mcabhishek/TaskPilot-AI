import { Router, Response } from 'express';
import { db } from '../../db/database.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';

export const calendarRouter = Router();
calendarRouter.use(authMiddleware);

// Get calendar items (tasks and milestones)
calendarRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  const { start_date, end_date } = req.query;

  try {
    let taskQuery = `
      SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date, t.start_date, t.estimated_duration,
             p.name as project_name, p.color as project_color, 'TASK' as item_type
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.user_id = ? AND t.due_date IS NOT NULL
    `;
    const taskParams: any[] = [userId];

    if (start_date) {
      taskQuery += ' AND t.due_date >= ?';
      taskParams.push(start_date);
    }
    if (end_date) {
      taskQuery += ' AND t.due_date <= ?';
      taskParams.push(end_date);
    }

    const tasks = db.prepare(taskQuery).all(...taskParams);

    // Milestones
    let milestoneQuery = `
      SELECT m.id, m.title, m.status, m.due_date, p.name as project_name, p.color as project_color, 'MILESTONE' as item_type
      FROM project_milestones m
      JOIN projects p ON m.project_id = p.id
      WHERE p.user_id = ? AND m.due_date IS NOT NULL
    `;
    const milestoneParams: any[] = [userId];

    if (start_date) {
      milestoneQuery += ' AND m.due_date >= ?';
      milestoneParams.push(start_date);
    }
    if (end_date) {
      milestoneQuery += ' AND m.due_date <= ?';
      milestoneParams.push(end_date);
    }

    const milestones = db.prepare(milestoneQuery).all(...milestoneParams);

    res.json({
      items: [...tasks, ...milestones],
    });
  } catch (err) {
    console.error('Calendar error:', err);
    res.status(500).json({ error: 'Failed to fetch calendar items.' });
  }
});

// Quick reschedule endpoint
calendarRouter.put('/reschedule/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { due_date } = req.body;

  if (!due_date) {
    res.status(400).json({ error: 'New due date is required.' });
    return;
  }

  try {
    const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(id, userId);
    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    db.prepare(`UPDATE tasks SET due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(due_date, id);
    res.json({ message: 'Task rescheduled successfully.', id, due_date });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reschedule task.' });
  }
});
