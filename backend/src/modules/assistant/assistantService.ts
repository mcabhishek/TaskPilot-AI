import { db } from '../../db/database.js';
import { TasksService } from '../tasks/tasksService.js';
import { RemindersService } from '../reminders/remindersService.js';
import { BriefingService } from '../briefing/briefingService.js';

export interface AssistantCommandResult {
  intent: string;
  user_input: string;
  spoken_response: string;
  display_text: string;
  action_taken?: string;
  data?: any;
}

export class AssistantService {
  /**
   * Processes a natural language voice or text command and dispatches to
   * authorized application services with real SQLite database persistence.
   */
  static async processCommand(userId: string, input: string): Promise<AssistantCommandResult> {
    const text = input ? input.trim() : '';
    const lower = text.toLowerCase();

    // 1. Daily Briefing intent
    if (
      lower.includes('briefing') ||
      lower.includes('what do i need to do') ||
      lower.includes('what to do today') ||
      lower.includes('my agenda') ||
      lower.includes('plan my day') ||
      lower.includes('schedule today')
    ) {
      const briefing = BriefingService.generateBriefing(userId);
      return {
        intent: 'GET_DAILY_BRIEFING',
        user_input: text,
        spoken_response: briefing.spoken_briefing,
        display_text: briefing.summary,
        action_taken: 'Loaded live daily briefing from database',
        data: briefing,
      };
    }

    // 2. Most Urgent Task intent
    if (
      lower.includes('most urgent') ||
      lower.includes('urgent task') ||
      lower.includes('what should i do first') ||
      lower.includes('what is next') ||
      lower.includes('top priority')
    ) {
      const urgentTask = db.prepare(`
        SELECT t.*, p.name as project_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.user_id = ? AND t.status != 'DONE'
        ORDER BY CASE t.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
                 CASE WHEN t.due_date < datetime('now') THEN 1 ELSE 2 END,
                 t.due_date ASC
        LIMIT 1
      `).get(userId) as any;

      if (!urgentTask) {
        return {
          intent: 'GET_URGENT_TASK',
          user_input: text,
          spoken_response: 'You currently have no active or pending tasks. You are all caught up!',
          display_text: 'No active tasks found.',
          data: null,
        };
      }

      const isOverdue = urgentTask.due_date && new Date(urgentTask.due_date) < new Date();
      const spoken = `Your top priority task is "${urgentTask.title}". It is marked as ${urgentTask.priority} priority${
        isOverdue ? ', and is currently overdue' : ''
      }.`;

      return {
        intent: 'GET_URGENT_TASK',
        user_input: text,
        spoken_response: spoken,
        display_text: `Top Priority: ${urgentTask.title} (${urgentTask.priority})`,
        action_taken: 'Queried prioritized active task',
        data: urgentTask,
      };
    }

    // 3. Mark Task as Done / Complete intent
    if (
      lower.includes('mark') && (lower.includes('done') || lower.includes('complete')) ||
      lower.startsWith('complete task') ||
      lower.startsWith('finish task')
    ) {
      // Extract search keyword
      let targetKeyword = lower
        .replace(/mark/g, '')
        .replace(/as done/g, '')
        .replace(/as completed/g, '')
        .replace(/complete task/g, '')
        .replace(/finish task/g, '')
        .replace(/my/g, '')
        .replace(/the/g, '')
        .trim();

      let targetTask = null;
      if (targetKeyword) {
        targetTask = db.prepare(`
          SELECT id, title FROM tasks
          WHERE user_id = ? AND status != 'DONE' AND (title LIKE ? OR description LIKE ?)
          ORDER BY updated_at DESC LIMIT 1
        `).get(userId, `%${targetKeyword}%`, `%${targetKeyword}%`) as any;
      }

      // If no specific keyword, grab the most recent in-progress task
      if (!targetTask) {
        targetTask = db.prepare(`
          SELECT id, title FROM tasks
          WHERE user_id = ? AND status != 'DONE'
          ORDER BY updated_at DESC LIMIT 1
        `).get(userId) as any;
      }

      if (!targetTask) {
        return {
          intent: 'COMPLETE_TASK',
          user_input: text,
          spoken_response: 'I could not find an active task to mark as complete.',
          display_text: 'No matching active task found.',
        };
      }

      const completed = TasksService.completeTask(userId, targetTask.id);
      return {
        intent: 'COMPLETE_TASK',
        user_input: text,
        spoken_response: `Nice work! I have marked "${completed.title}" as completed.`,
        display_text: `Completed task: ${completed.title}`,
        action_taken: `Updated task ${completed.id} status to DONE in database`,
        data: completed,
      };
    }

    // 4. Create Reminder intent
    if (lower.includes('remind me') || lower.includes('set reminder') || lower.includes('create reminder')) {
      // Extract minute duration or default to 30 mins
      let minutes = 30;
      const minMatch = lower.match(/(\d+)\s*(?:minute|min|m)/);
      const hourMatch = lower.match(/(\d+)\s*(?:hour|hr|h)/);
      if (minMatch) {
        minutes = parseInt(minMatch[1], 10);
      } else if (hourMatch) {
        minutes = parseInt(hourMatch[1], 10) * 60;
      } else if (lower.includes('tomorrow')) {
        minutes = 1440; // 24 hours
      }

      // Clean task query keyword
      let cleanedKeyword = lower
        .replace(/remind me to/g, '')
        .replace(/remind me about/g, '')
        .replace(/remind me/g, '')
        .replace(/set reminder for/g, '')
        .replace(/set reminder/g, '')
        .replace(/create reminder/g, '')
        .replace(/in \d+.*$/g, '')
        .replace(/tomorrow.*$/g, '')
        .trim();

      let targetTask = null;
      if (cleanedKeyword) {
        targetTask = db.prepare(`
          SELECT id, title FROM tasks
          WHERE user_id = ? AND status != 'DONE' AND (title LIKE ? OR description LIKE ?)
          ORDER BY updated_at DESC LIMIT 1
        `).get(userId, `%${cleanedKeyword}%`, `%${cleanedKeyword}%`) as any;
      }

      // If no task matched, create task on the fly or pick first active task
      if (!targetTask) {
        if (cleanedKeyword && cleanedKeyword.length > 2) {
          targetTask = TasksService.createTask({
            userId,
            title: cleanedKeyword.charAt(0).toUpperCase() + cleanedKeyword.slice(1),
            priority: 'HIGH',
            due_date: new Date(Date.now() + minutes * 60 * 1000).toISOString(),
          });
        } else {
          targetTask = db.prepare(`
            SELECT id, title FROM tasks WHERE user_id = ? AND status != 'DONE' ORDER BY updated_at DESC LIMIT 1
          `).get(userId) as any;
        }
      }

      if (!targetTask) {
        return {
          intent: 'CREATE_REMINDER',
          user_input: text,
          spoken_response: 'Please specify which task you would like a reminder for.',
          display_text: 'Please specify task title.',
        };
      }

      const reminderTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      const reminder = RemindersService.createReminder({
        userId,
        taskId: targetTask.id,
        reminderTime,
        reminderType: 'CUSTOM',
      });

      return {
        intent: 'CREATE_REMINDER',
        user_input: text,
        spoken_response: `I set a reminder for "${targetTask.title}" scheduled for ${minutes < 60 ? `${minutes} minutes from now` : `about ${Math.round(minutes / 60)} hours from now`}.`,
        display_text: `Reminder set: ${targetTask.title} at ${new Date(reminderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        action_taken: `Saved persistent reminder ${reminder.id} in SQLite`,
        data: reminder,
      };
    }

    // 5. Snooze Reminder intent
    if (lower.includes('snooze')) {
      let minutes = 15;
      const match = lower.match(/(\d+)\s*(?:minute|min|m)/);
      if (match) {
        minutes = parseInt(match[1], 10);
      }

      // Find latest pending or sent reminder
      const latestReminder = db.prepare(`
        SELECT r.id, t.title FROM reminders r
        JOIN tasks t ON r.task_id = t.id
        WHERE r.user_id = ?
        ORDER BY r.updated_at DESC LIMIT 1
      `).get(userId) as any;

      if (!latestReminder) {
        return {
          intent: 'SNOOZE_REMINDER',
          user_input: text,
          spoken_response: 'You have no recent reminders to snooze.',
          display_text: 'No active reminders found to snooze.',
        };
      }

      const snoozed = RemindersService.snoozeReminder({
        userId,
        reminderId: latestReminder.id,
        minutes,
      });

      return {
        intent: 'SNOOZE_REMINDER',
        user_input: text,
        spoken_response: `I have snoozed your reminder for "${latestReminder.title}" for ${minutes} minutes.`,
        display_text: `Snoozed: ${latestReminder.title} (+${minutes}m)`,
        action_taken: `Updated reminder ${latestReminder.id} snooze_until timestamp`,
        data: snoozed,
      };
    }

    // 6. Create Task intent
    if (lower.startsWith('create task') || lower.startsWith('add task') || lower.startsWith('new task')) {
      let taskTitle = lower
        .replace(/create task/g, '')
        .replace(/add task/g, '')
        .replace(/new task/g, '')
        .trim();

      if (!taskTitle) {
        taskTitle = 'Quick Voice Note Task';
      }

      // Detect priority
      let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM';
      if (lower.includes('urgent')) priority = 'URGENT';
      else if (lower.includes('high priority')) priority = 'HIGH';
      else if (lower.includes('low priority')) priority = 'LOW';

      const capitalized = taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1);
      const created = TasksService.createTask({
        userId,
        title: capitalized,
        priority,
        due_date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
      });

      return {
        intent: 'CREATE_TASK',
        user_input: text,
        spoken_response: `I created the task "${created.title}" with ${priority} priority for tomorrow.`,
        display_text: `Created task: ${created.title}`,
        action_taken: `Inserted task ${created.id} into database`,
        data: created,
      };
    }

    // 7. List Tasks intent
    if (lower.includes('list tasks') || lower.includes('show tasks') || lower.includes('my tasks') || lower.includes('what tasks')) {
      const tasks = TasksService.listTasks({ userId, limit: 5 });
      const titles = tasks.map((t: any) => t.title).slice(0, 3).join(', ');
      const spoken = tasks.length > 0
        ? `You have ${tasks.length} active tasks, including: ${titles}.`
        : 'You have no active tasks currently on your board.';

      return {
        intent: 'LIST_TASKS',
        user_input: text,
        spoken_response: spoken,
        display_text: `Found ${tasks.length} tasks`,
        data: tasks,
      };
    }

    // Default Fallback
    return {
      intent: 'GENERAL_ASSISTANCE',
      user_input: text,
      spoken_response: `I heard: "${text}". You can ask me to "give me my daily briefing", "show my most urgent task", "remind me to finish assignment in 30 minutes", or "mark task as done".`,
      display_text: `Available voice commands: Daily Briefing, Urgent Task, Remind Me, Complete Task, Create Task`,
      data: null,
    };
  }
}
