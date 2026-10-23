import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { v4 as uuidv4 } from 'uuid';
import { db, initDatabase } from '../db/database.js';
import { TasksService } from '../modules/tasks/tasksService.js';
import { RemindersService } from '../modules/reminders/remindersService.js';
import { BriefingService } from '../modules/briefing/briefingService.js';
import { AssistantService } from '../modules/assistant/assistantService.js';

initDatabase();

describe('TaskPilot AI — Smart Reminders, Daily Briefing & Assistant Test Suite', () => {
  const testUserId = uuidv4();
  const otherUserId = uuidv4();

  // Create isolated test users
  db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, password_hash)
    VALUES (?, 'Jordan Lee', ?, 'hash'), (?, 'Other User', ?, 'hash')
  `).run(
    testUserId, `jordan_${Date.now()}@test.com`,
    otherUserId, `other_${Date.now()}@test.com`
  );

  it('Reminders: schedules a reminder for an existing active task', () => {
    const task = TasksService.createTask({
      userId: testUserId,
      title: 'Submit Final Hackathon Submission',
      priority: 'HIGH',
    });

    const reminderTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const reminder = RemindersService.createReminder({
      userId: testUserId,
      taskId: task.id,
      reminderTime,
      reminderType: 'EXACT_TIME',
    });

    assert.ok(reminder, 'Reminder should be created');
    assert.strictEqual(reminder.task_id, task.id);
    assert.strictEqual(reminder.delivery_status, 'PENDING');
    assert.strictEqual(reminder.reminder_type, 'EXACT_TIME');
  });

  it('Reminders Validation: rejects reminder for non-existent task or other user task', () => {
    const otherTask = TasksService.createTask({
      userId: otherUserId,
      title: 'Other User Secret Task',
    });

    // Test user attempts to schedule reminder on other user's task
    assert.throws(
      () =>
        RemindersService.createReminder({
          userId: testUserId,
          taskId: otherTask.id,
          reminderTime: new Date(Date.now() + 60000).toISOString(),
        }),
      /Task not found or access denied/
    );

    // Non-existent task ID
    assert.throws(
      () =>
        RemindersService.createReminder({
          userId: testUserId,
          taskId: 'non-existent-id',
          reminderTime: new Date(Date.now() + 60000).toISOString(),
        }),
      /Task not found or access denied/
    );
  });

  it('Reminders Validation: rejects reminder on already completed tasks', () => {
    const task = TasksService.createTask({
      userId: testUserId,
      title: 'Already Completed Assignment',
      status: 'DONE',
    });

    assert.throws(
      () =>
        RemindersService.createReminder({
          userId: testUserId,
          taskId: task.id,
          reminderTime: new Date(Date.now() + 60000).toISOString(),
        }),
      /Cannot schedule a reminder for a completed task/
    );
  });

  it('Reminders Lifecycle: snoozes and dismisses reminder properly', () => {
    const task = TasksService.createTask({
      userId: testUserId,
      title: 'Prepare Presentation Slides',
    });

    const reminder = RemindersService.createReminder({
      userId: testUserId,
      taskId: task.id,
      reminderTime: new Date(Date.now() + 60000).toISOString(),
    });

    // Snooze 30 mins
    const snoozed = RemindersService.snoozeReminder({
      userId: testUserId,
      reminderId: reminder.id,
      minutes: 30,
    });

    assert.strictEqual(snoozed.delivery_status, 'SNOOZED');
    assert.ok(snoozed.snooze_until, 'snooze_until must be populated');
    const snoozeDiffMs = new Date(snoozed.snooze_until).getTime() - Date.now();
    assert.ok(snoozeDiffMs > 25 * 60 * 1000 && snoozeDiffMs <= 31 * 60 * 1000, 'Snooze window should be ~30 mins');

    // Dismiss reminder
    const dismissed = RemindersService.dismissReminder(testUserId, reminder.id);
    assert.strictEqual(dismissed.success, true);

    const check = RemindersService.getReminderById(testUserId, reminder.id);
    assert.strictEqual(check.delivery_status, 'DISMISSED');
  });

  it('Reminders Scheduler: delivers due reminders and prevents duplicate notifications', () => {
    const task = TasksService.createTask({
      userId: testUserId,
      title: 'Time Sensitive Review Action',
      due_date: new Date(Date.now() + 3600000).toISOString(),
    });

    // Create a reminder explicitly due in the past
    const pastTime = new Date(Date.now() - 5000).toISOString();
    const reminder = RemindersService.createReminder({
      userId: testUserId,
      taskId: task.id,
      reminderTime: pastTime,
    });

    // Process due reminders
    const deliveredFirst = RemindersService.processDueReminders();
    const foundDelivered = deliveredFirst.find((d) => d.reminder_id === reminder.id);
    assert.ok(foundDelivered, 'Reminder due in past must be delivered');

    // Verify reminder status updated to SENT
    const updated = RemindersService.getReminderById(testUserId, reminder.id);
    assert.strictEqual(updated.delivery_status, 'SENT');
    assert.ok(updated.last_delivered_at, 'last_delivered_at should be recorded');

    // Verify notification was created in database
    const notifs = db.prepare('SELECT * FROM notifications WHERE user_id = ? AND action_payload LIKE ?').all(
      testUserId,
      `%"reminder_id":"${reminder.id}"%`
    );
    assert.strictEqual(notifs.length, 1, 'Exactly one notification must be generated');

    // Idempotency check: Running scanner again immediately should NOT generate duplicate
    const deliveredSecond = RemindersService.processDueReminders();
    const duplicate = deliveredSecond.find((d) => d.reminder_id === reminder.id);
    assert.strictEqual(duplicate, undefined, 'Second scan must not deliver duplicate notification');
  });

  it('Daily Briefing: generates empty runway state for user with no tasks', () => {
    const emptyUserId = uuidv4();
    db.prepare('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)').run(
      emptyUserId,
      'Empty User',
      `empty_${Date.now()}@test.com`,
      'h'
    );

    const briefing = BriefingService.generateBriefing(emptyUserId);
    assert.strictEqual(briefing.has_tasks, false);
    assert.ok(briefing.greeting.includes('Empty'));
    assert.ok(briefing.spoken_briefing.includes('zero overdue tasks'));
    assert.strictEqual(briefing.tasks_due_today.length, 0);
  });

  it('Daily Briefing: identifies overdue items and prioritizes recommended order', () => {
    const userWithTasks = uuidv4();
    db.prepare('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)').run(
      userWithTasks,
      'Busy User',
      `busy_${Date.now()}@test.com`,
      'h'
    );

    // Create overdue task
    TasksService.createTask({
      userId: userWithTasks,
      title: 'Overdue Client Proposal',
      due_date: new Date(Date.now() - 86400000).toISOString(), // yesterday
      priority: 'HIGH',
    });

    // Create normal task
    TasksService.createTask({
      userId: userWithTasks,
      title: 'Routine Status Checkin',
      priority: 'LOW',
    });

    const briefing = BriefingService.generateBriefing(userWithTasks);
    assert.strictEqual(briefing.has_tasks, true);
    assert.strictEqual(briefing.overdue_tasks.length, 1);
    assert.strictEqual(briefing.overdue_tasks[0].title, 'Overdue Client Proposal');
    assert.ok(briefing.headline.includes('1 Overdue Task'));
    assert.strictEqual(briefing.recommended_order[0].task.title, 'Overdue Client Proposal');
    assert.ok(briefing.recommended_order[0].reason.includes('Overdue'));
  });

  it('Alexa-Style Assistant: processes speech commands and persists changes in SQLite', async () => {
    // 1. Briefing command
    const resBriefing = await AssistantService.processCommand(testUserId, 'Give me my daily briefing');
    assert.strictEqual(resBriefing.intent, 'GET_DAILY_BRIEFING');
    assert.ok(resBriefing.spoken_response.length > 10);

    // 2. Urgent task command
    const resUrgent = await AssistantService.processCommand(testUserId, 'What is my most urgent task?');
    assert.strictEqual(resUrgent.intent, 'GET_URGENT_TASK');
    assert.ok(resUrgent.spoken_response.includes('priority'));

    // 3. Create reminder command
    const resReminder = await AssistantService.processCommand(
      testUserId,
      'Remind me about database schema review in 45 minutes'
    );
    assert.strictEqual(resReminder.intent, 'CREATE_REMINDER');
    assert.ok(resReminder.spoken_response.includes('reminder'));
    assert.ok(resReminder.data.id, 'Reminder ID must be generated');

    // Verify reminder is in database
    const savedReminder = RemindersService.getReminderById(testUserId, resReminder.data.id);
    assert.ok(savedReminder, 'Reminder must be persisted in SQLite');
    assert.strictEqual(savedReminder.delivery_status, 'PENDING');

    // 4. Complete task command
    const taskToComplete = TasksService.createTask({
      userId: testUserId,
      title: 'Vocal Command Target Task',
    });

    const resComplete = await AssistantService.processCommand(
      testUserId,
      'Mark Vocal Command Target Task as done'
    );
    assert.strictEqual(resComplete.intent, 'COMPLETE_TASK');
    assert.ok(resComplete.spoken_response.includes('completed'));

    // Verify task is DONE in database
    const checkTask = TasksService.getTaskById(testUserId, taskToComplete.id);
    assert.strictEqual(checkTask.status, 'DONE');
    assert.ok(checkTask.completed_at, 'completed_at must be populated');
  });

  it('Reminders: auto-creates linked task if taskTitle is provided without taskId', () => {
    const reminderTime = new Date(Date.now() + 7200000).toISOString();
    const reminder = RemindersService.createReminder({
      userId: testUserId,
      taskTitle: 'Standalone Voice Reminder Target',
      reminderTime,
    });

    assert.ok(reminder, 'Reminder should be created');
    assert.ok(reminder.task_id, 'Task ID should be automatically assigned');
    assert.strictEqual(reminder.task_title, 'Standalone Voice Reminder Target');

    // Verify task was created in DB
    const createdTask = TasksService.getTaskById(testUserId, reminder.task_id);
    assert.ok(createdTask, 'Task must be persisted in SQLite');
    assert.strictEqual(createdTask.title, 'Standalone Voice Reminder Target');
  });

  it('Reminders: filters reminders by UPCOMING and OVERDUE status', () => {
    const upcoming = RemindersService.listReminders(testUserId, { status: 'UPCOMING' }) as any[];
    assert.ok(Array.isArray(upcoming));
    for (const r of upcoming) {
      assert.ok(['PENDING', 'SNOOZED'].includes(r.delivery_status));
    }
  });

  after(() => {
    db.prepare('DELETE FROM users WHERE email LIKE ?').run('%@test.com');
  });
});
