import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/database.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';

export const analyticsRouter = Router();
analyticsRouter.use(authMiddleware);

analyticsRouter.get('/overview', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;

  try {
    const totalTasks = (db.prepare('SELECT COUNT(*) as c FROM tasks WHERE user_id = ?').get(userId) as any).c;
    const completedTasks = (db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status = 'DONE'").get(userId) as any).c;
    const overdueTasks = (db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND due_date < datetime('now') AND status != 'DONE'").get(userId) as any).c;
    const inProgressTasks = (db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status = 'IN_PROGRESS'").get(userId) as any).c;

    // Priority breakdown
    const priorityStats = db.prepare(`
      SELECT priority, COUNT(*) as count
      FROM tasks
      WHERE user_id = ?
      GROUP BY priority
    `).all(userId);

    // Status breakdown
    const statusStats = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM tasks
      WHERE user_id = ?
      GROUP BY status
    `).all(userId);

    // Total focus minutes logged
    const totalFocusMinutes = (db.prepare(`
      SELECT COALESCE(SUM(duration_minutes), 0) as total
      FROM focus_sessions
      WHERE user_id = ?
    `).get(userId) as any).total;

    // Recent 7 days task activity
    const dailyActivity = db.prepare(`
      SELECT date(created_at) as day, COUNT(*) as created_count,
             (SELECT COUNT(*) FROM tasks t2 WHERE t2.user_id = ? AND date(t2.completed_at) = date(t1.created_at)) as completed_count
      FROM tasks t1
      WHERE user_id = ? AND created_at >= datetime('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY day ASC
    `).all(userId, userId);

    res.json({
      summary: {
        totalTasks,
        completedTasks,
        overdueTasks,
        inProgressTasks,
        totalFocusMinutes,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
      priorityStats,
      statusStats,
      dailyActivity,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics.' });
  }
});

// Log a focus session (Pomodoro / deep work timer)
analyticsRouter.post('/focus-sessions', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { duration_minutes, task_id, notes } = req.body;

  if (!duration_minutes || duration_minutes <= 0) {
    res.status(400).json({ error: 'Valid duration in minutes is required.' });
    return;
  }

  const id = uuidv4();
  try {
    db.prepare(`
      INSERT INTO focus_sessions (id, user_id, task_id, duration_minutes, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, task_id || null, Number(duration_minutes), notes || '');

    const record = db.prepare('SELECT * FROM focus_sessions WHERE id = ?').get(id);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: 'Failed to record focus session.' });
  }
});
