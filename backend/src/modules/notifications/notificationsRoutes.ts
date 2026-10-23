import { Router, Response } from 'express';
import { db } from '../../db/database.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';

export const notificationsRouter = Router();
notificationsRouter.use(authMiddleware);

// Get user notifications
notificationsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  try {
    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 30
    `).all(userId);

    const unreadCount = (db.prepare(`
      SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0
    `).get(userId) as any).c;

    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// Mark notification as read
notificationsRouter.put('/:id/read', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;

  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, userId);
    res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// Mark all as read
notificationsRouter.post('/read-all', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
});
