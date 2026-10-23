import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../../db/database.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';

export const settingsRouter = Router();
settingsRouter.use(authMiddleware);

// Get user profile and preferences
settingsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;

  try {
    const user = db.prepare('SELECT id, name, email, avatar_url, timezone, theme, created_at FROM users WHERE id = ?').get(userId);
    const preferences = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
    res.json({ user, preferences });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings.' });
  }
});

// Update profile
settingsRouter.put('/profile', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { name, timezone, theme } = req.body;

  try {
    db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          timezone = COALESCE(?, timezone),
          theme = COALESCE(?, theme),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name ? name.trim() : null, timezone || null, theme || null, userId);

    const updated = db.prepare('SELECT id, name, email, avatar_url, timezone, theme FROM users WHERE id = ?').get(userId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Update preferences
settingsRouter.put('/preferences', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { work_hours_start, work_hours_end, daily_task_goal, ai_suggestions_enabled, email_notifications, in_app_notifications } = req.body;

  try {
    db.prepare(`
      UPDATE user_preferences
      SET work_hours_start = COALESCE(?, work_hours_start),
          work_hours_end = COALESCE(?, work_hours_end),
          daily_task_goal = COALESCE(?, daily_task_goal),
          ai_suggestions_enabled = COALESCE(?, ai_suggestions_enabled),
          email_notifications = COALESCE(?, email_notifications),
          in_app_notifications = COALESCE(?, in_app_notifications)
      WHERE user_id = ?
    `).run(
      work_hours_start || null,
      work_hours_end || null,
      daily_task_goal !== undefined ? Number(daily_task_goal) : null,
      ai_suggestions_enabled !== undefined ? (ai_suggestions_enabled ? 1 : 0) : null,
      email_notifications !== undefined ? (email_notifications ? 1 : 0) : null,
      in_app_notifications !== undefined ? (in_app_notifications ? 1 : 0) : null,
      userId
    );

    const updated = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update preferences.' });
  }
});

// Change password
settingsRouter.post('/change-password', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current and new password are required.' });
    return;
  }

  try {
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any;
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      res.status(400).json({ error: 'Incorrect current password.' });
      return;
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, userId);

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password.' });
  }
});
