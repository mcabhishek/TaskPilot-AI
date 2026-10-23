import { Router, Response } from 'express';
import { db } from '../../db/database.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';

export const dashboardRouter = Router();
dashboardRouter.use(authMiddleware);

dashboardRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;

  try {
    const totalActiveTasks = (db.prepare(`
      SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status != 'DONE'
    `).get(userId) as any).c;

    const completedTasks = (db.prepare(`
      SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status = 'DONE'
    `).get(userId) as any).c;

    const overdueTasks = (db.prepare(`
      SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND due_date < datetime('now') AND status != 'DONE'
    `).get(userId) as any).c;

    const dueTodayTasks = (db.prepare(`
      SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND date(due_date) = date('now') AND status != 'DONE'
    `).get(userId) as any).c;

    const totalProjects = (db.prepare(`
      SELECT COUNT(*) as c FROM projects WHERE user_id = ?
    `).get(userId) as any).c;

    // Upcoming deadlines (next 7 days)
    const upcomingTasks = db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.user_id = ? AND t.status != 'DONE' AND t.due_date >= datetime('now')
      ORDER BY t.due_date ASC
      LIMIT 5
    `).all(userId);

    // Overdue tasks list
    const overdueList = db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.user_id = ? AND t.status != 'DONE' AND t.due_date < datetime('now')
      ORDER BY t.due_date ASC
      LIMIT 5
    `).all(userId);

    // Recent projects with progress
    const recentProjects = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as total_tasks,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'DONE') as completed_tasks
      FROM projects p
      WHERE p.user_id = ?
      ORDER BY p.updated_at DESC
      LIMIT 4
    `).all(userId) as any[];

    const projectsWithProgress = recentProjects.map(p => ({
      ...p,
      progress: p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0,
    }));

    // Recent activity stream
    const recentActivity = db.prepare(`
      SELECT * FROM activity_events
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 8
    `).all(userId);

    // Productivity rate
    const totalAll = totalActiveTasks + completedTasks;
    const completionRate = totalAll > 0 ? Math.round((completedTasks / totalAll) * 100) : 0;

    res.json({
      summary: {
        totalActiveTasks,
        completedTasks,
        overdueTasks,
        dueTodayTasks,
        totalProjects,
        completionRate,
      },
      upcomingTasks,
      overdueList,
      recentProjects: projectsWithProgress,
      recentActivity,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data.' });
  }
});
