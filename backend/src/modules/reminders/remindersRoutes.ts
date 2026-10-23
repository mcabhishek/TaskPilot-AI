import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';
import { RemindersService } from './remindersService.js';

export const remindersRouter = Router();
remindersRouter.use(authMiddleware);

// List user reminders
remindersRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { taskId, status } = req.query;

  try {
    const reminders = RemindersService.listReminders(userId, {
      taskId: taskId as string,
      status: status as string,
    });
    res.json(reminders);
  } catch (err: any) {
    console.error('Error fetching reminders:', err);
    res.status(500).json({ error: 'Failed to fetch reminders.' });
  }
});

// Create reminder
remindersRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { taskId, reminderTime, reminderType } = req.body;

  try {
    const reminder = RemindersService.createReminder({
      userId,
      taskId,
      reminderTime,
      reminderType,
    });
    res.status(201).json(reminder);
  } catch (err: any) {
    console.error('Error creating reminder:', err);
    res.status(400).json({ error: err.message || 'Failed to create reminder.' });
  }
});

// Snooze reminder
remindersRouter.post('/:id/snooze', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { minutes } = req.body;

  try {
    const updated = RemindersService.snoozeReminder({
      userId,
      reminderId: id,
      minutes: minutes ? Number(minutes) : 15,
    });
    res.json(updated);
  } catch (err: any) {
    console.error('Error snoozing reminder:', err);
    res.status(400).json({ error: err.message || 'Failed to snooze reminder.' });
  }
});

// Dismiss reminder
remindersRouter.post('/:id/dismiss', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  try {
    const result = RemindersService.dismissReminder(userId, id);
    res.json(result);
  } catch (err: any) {
    console.error('Error dismissing reminder:', err);
    res.status(400).json({ error: err.message || 'Failed to dismiss reminder.' });
  }
});

// Delete reminder
remindersRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  try {
    const result = RemindersService.deleteReminder(userId, id);
    res.json(result);
  } catch (err: any) {
    console.error('Error deleting reminder:', err);
    res.status(400).json({ error: err.message || 'Failed to delete reminder.' });
  }
});

// Manually trigger scan (for testing or instant UI sync)
remindersRouter.post('/scan-now', (_req: AuthenticatedRequest, res: Response) => {
  try {
    const delivered = RemindersService.processDueReminders();
    res.json({ success: true, count: delivered.length, delivered });
  } catch (err: any) {
    console.error('Error processing reminders:', err);
    res.status(500).json({ error: 'Failed to process reminders.' });
  }
});
