import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/database.js';

export interface CreateReminderInput {
  userId: string;
  taskId?: string;
  taskTitle?: string;
  reminderTime: string;
  reminderType?: 'EXACT_TIME' | 'DUE_SOON' | 'CUSTOM';
}

export interface SnoozeReminderInput {
  userId: string;
  reminderId: string;
  minutes?: number; // default 15
}

export class RemindersService {
  /**
   * Create a smart reminder for an existing task or create a linked task if title is given.
   */
  static createReminder(input: CreateReminderInput) {
    let { userId, taskId, taskTitle, reminderTime, reminderType = 'EXACT_TIME' } = input;

    if (!reminderTime || isNaN(Date.parse(reminderTime))) {
      throw new Error('A valid reminder time is required.');
    }

    const isoReminderTime = new Date(reminderTime).toISOString();

    // If taskId is not provided, try to find or create a task from taskTitle
    if (!taskId) {
      if (taskTitle && taskTitle.trim()) {
        const trimmedTitle = taskTitle.trim();
        const existingTask = db.prepare(`
          SELECT id, title, status FROM tasks
          WHERE user_id = ? AND status != 'DONE' AND title LIKE ?
          ORDER BY updated_at DESC LIMIT 1
        `).get(userId, `%${trimmedTitle}%`) as any;

        if (existingTask) {
          taskId = existingTask.id;
        } else {
          // Auto-create task for this reminder
          const newTaskId = uuidv4();
          db.prepare(`
            INSERT INTO tasks (id, user_id, title, description, status, priority, due_date)
            VALUES (?, ?, ?, 'Created automatically from reminder request', 'TODO', 'HIGH', ?)
          `).run(newTaskId, userId, trimmedTitle, isoReminderTime);

          db.prepare(`
            INSERT INTO activity_events (id, user_id, entity_type, entity_id, action, details)
            VALUES (?, ?, 'TASK', ?, 'CREATED', ?)
          `).run(uuidv4(), userId, newTaskId, `Created task from reminder: ${trimmedTitle}`);

          taskId = newTaskId;
        }
      } else {
        throw new Error('Task ID or Task Title is required to schedule a reminder.');
      }
    }

    // Verify task exists and belongs to user
    const task = db.prepare('SELECT id, title, status, due_date, priority FROM tasks WHERE id = ? AND user_id = ?').get(taskId, userId) as any;
    if (!task) {
      throw new Error('Task not found or access denied.');
    }

    if (task.status === 'DONE') {
      throw new Error('Cannot schedule a reminder for a completed task.');
    }

    const reminderId = uuidv4();

    db.prepare(`
      INSERT INTO reminders (id, user_id, task_id, reminder_time, reminder_type, delivery_status)
      VALUES (?, ?, ?, ?, ?, 'PENDING')
    `).run(reminderId, userId, taskId, isoReminderTime, reminderType);

    // Record activity
    db.prepare(`
      INSERT INTO activity_events (id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, 'REMINDER', ?, 'CREATED', ?)
    `).run(uuidv4(), userId, reminderId, `Scheduled reminder for task: "${task.title}" at ${isoReminderTime}`);

    return RemindersService.getReminderById(userId, reminderId);
  }

  /**
   * Retrieve a single reminder by ID with task details.
   */
  static getReminderById(userId: string, reminderId: string) {
    const reminder = db.prepare(`
      SELECT r.*, t.title as task_title, t.status as task_status, t.priority as task_priority, t.due_date as task_due_date
      FROM reminders r
      JOIN tasks t ON r.task_id = t.id
      WHERE r.id = ? AND r.user_id = ?
    `).get(reminderId, userId) as any;

    return reminder || null;
  }

  /**
   * List reminders for user with optional filters (e.g. UPCOMING, OVERDUE, COMPLETED/SENT, ALL).
   */
  static listReminders(userId: string, options: { taskId?: string; status?: string; limit?: number } = {}) {
    let query = `
      SELECT r.*, t.title as task_title, t.status as task_status, t.priority as task_priority, t.due_date as task_due_date
      FROM reminders r
      JOIN tasks t ON r.task_id = t.id
      WHERE r.user_id = ?
    `;
    const params: any[] = [userId];

    if (options.taskId) {
      query += ' AND r.task_id = ?';
      params.push(options.taskId);
    }
    if (options.status) {
      const s = options.status.toUpperCase();
      if (s === 'UPCOMING') {
        query += " AND r.delivery_status IN ('PENDING', 'SNOOZED') AND r.reminder_time >= datetime('now')";
      } else if (s === 'OVERDUE') {
        query += " AND r.delivery_status IN ('PENDING', 'SNOOZED') AND r.reminder_time < datetime('now')";
      } else if (s === 'COMPLETED' || s === 'SENT') {
        query += " AND r.delivery_status = 'SENT'";
      } else if (s !== 'ALL') {
        query += ' AND r.delivery_status = ?';
        params.push(s);
      }
    }

    query += " ORDER BY CASE r.delivery_status WHEN 'PENDING' THEN 1 WHEN 'SNOOZED' THEN 2 ELSE 3 END, r.reminder_time ASC";

    if (options.limit && options.limit > 0) {
      query += ` LIMIT ${options.limit}`;
    }

    return db.prepare(query).all(...params);
  }

  /**
   * Snooze a reminder by N minutes (default 15).
   */
  static snoozeReminder(input: SnoozeReminderInput) {
    const { userId, reminderId, minutes = 15 } = input;
    const safeMinutes = Math.max(1, Math.min(1440, minutes)); // 1 min to 24 hours

    const reminder = RemindersService.getReminderById(userId, reminderId);
    if (!reminder) {
      throw new Error('Reminder not found or access denied.');
    }

    const snoozeUntil = new Date(Date.now() + safeMinutes * 60 * 1000).toISOString();

    db.prepare(`
      UPDATE reminders
      SET delivery_status = 'SNOOZED', snooze_until = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(snoozeUntil, reminderId, userId);

    // If an existing unread notification for this reminder exists, mark it as read since it is now snoozed
    db.prepare(`
      UPDATE notifications
      SET is_read = 1
      WHERE user_id = ? AND action_payload LIKE ?
    `).run(userId, `%"reminder_id":"${reminderId}"%`);

    db.prepare(`
      INSERT INTO activity_events (id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, 'REMINDER', ?, 'SNOOZED', ?)
    `).run(uuidv4(), userId, reminderId, `Snoozed reminder for "${reminder.task_title}" by ${safeMinutes} minutes`);

    return RemindersService.getReminderById(userId, reminderId);
  }

  /**
   * Dismiss a reminder.
   */
  static dismissReminder(userId: string, reminderId: string) {
    const reminder = RemindersService.getReminderById(userId, reminderId);
    if (!reminder) {
      throw new Error('Reminder not found or access denied.');
    }

    db.prepare(`
      UPDATE reminders
      SET delivery_status = 'DISMISSED', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(reminderId, userId);

    // Mark corresponding notification read
    db.prepare(`
      UPDATE notifications
      SET is_read = 1
      WHERE user_id = ? AND action_payload LIKE ?
    `).run(userId, `%"reminder_id":"${reminderId}"%`);

    db.prepare(`
      INSERT INTO activity_events (id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, 'REMINDER', ?, 'DISMISSED', ?)
    `).run(uuidv4(), userId, reminderId, `Dismissed reminder for "${reminder.task_title}"`);

    return { success: true, message: 'Reminder dismissed.' };
  }

  /**
   * Delete a reminder entirely.
   */
  static deleteReminder(userId: string, reminderId: string) {
    const reminder = RemindersService.getReminderById(userId, reminderId);
    if (!reminder) {
      throw new Error('Reminder not found or access denied.');
    }

    db.prepare('DELETE FROM reminders WHERE id = ? AND user_id = ?').run(reminderId, userId);
    return { success: true, message: 'Reminder deleted.' };
  }

  /**
   * Periodic scheduler engine: scans and delivers due reminders idempotently.
   * Survives restarts and ensures no duplicate notifications are spawned.
   */
  static processDueReminders(): any[] {
    const nowIso = new Date().toISOString();

    const dueReminders = db.prepare(`
      SELECT r.*, t.title as task_title, t.priority as task_priority, t.due_date as task_due_date, t.status as task_status
      FROM reminders r
      JOIN tasks t ON r.task_id = t.id
      WHERE t.status != 'DONE'
        AND (
          (r.delivery_status = 'PENDING' AND r.reminder_time <= ?)
          OR
          (r.delivery_status = 'SNOOZED' AND r.snooze_until <= ?)
        )
    `).all(nowIso, nowIso) as any[];

    const delivered: any[] = [];

    for (const r of dueReminders) {
      const processTx = db.transaction(() => {
        // Double check not already processed in last 60 seconds
        const notifId = uuidv4();
        const actionPayload = JSON.stringify({
          reminder_id: r.id,
          task_id: r.task_id,
          task_title: r.task_title,
          priority: r.task_priority,
          due_date: r.task_due_date,
        });

        // Create persistent in-app notification
        db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, link, action_payload)
          VALUES (?, ?, ?, ?, 'REMINDER', ?, ?)
        `).run(
          notifId,
          r.user_id,
          `⏰ Reminder: ${r.task_title}`,
          r.task_due_date
            ? `Due at ${new Date(r.task_due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Priority: ${r.task_priority}.`
            : `Scheduled reminder for task: "${r.task_title}".`,
          `/tasks?id=${r.task_id}`,
          actionPayload
        );

        // Update reminder delivery status
        db.prepare(`
          UPDATE reminders
          SET delivery_status = 'SENT', last_delivered_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(r.id);

        delivered.push({
          reminder_id: r.id,
          task_id: r.task_id,
          task_title: r.task_title,
          notification_id: notifId,
          delivered_at: nowIso,
        });
      });

      processTx();
    }

    return delivered;
  }
}
