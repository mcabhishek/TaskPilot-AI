import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db/database.js';
import { TasksService } from '../modules/tasks/tasksService.js';
import { RemindersService } from '../modules/reminders/remindersService.js';
import { BriefingService } from '../modules/briefing/briefingService.js';

/**
 * Creates an official MCP server instance scoped to a specific authenticated user.
 * This guarantees strict tenant isolation: tool executions can only access or mutate
 * the authenticated user's records.
 *
 * Implements all 10 official Model Context Protocol (MCP) tools required for the
 * Amazon Alexa+ Hackathon.
 */
export function createTaskPilotMcpServer(userId: string): McpServer {
  const server = new McpServer({
    name: 'TaskPilot-AI-MCP-Server',
    version: '1.0.0',
  });

  // Helper to resolve task_id from either task_id or task_title
  function resolveTaskId(taskId?: string, taskTitle?: string): string {
    if (taskId && taskId.trim()) return taskId.trim();
    if (taskTitle && taskTitle.trim()) {
      const match = db.prepare(`
        SELECT id FROM tasks
        WHERE user_id = ? AND (title LIKE ? OR description LIKE ?)
        ORDER BY updated_at DESC LIMIT 1
      `).get(userId, `%${taskTitle.trim()}%`, `%${taskTitle.trim()}%`) as any;
      if (match) return match.id;
    }
    throw new Error('Please provide a valid task_id or task_title to identify the task.');
  }

  // Tool 1: get_daily_briefing
  server.tool(
    'get_daily_briefing',
    "Return today's tasks, upcoming deadlines, overdue tasks, and scheduled reminders.",
    {},
    async () => {
      try {
        const briefing = BriefingService.generateBriefing(userId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  briefing: {
                    greeting: briefing.greeting,
                    headline: briefing.headline,
                    summary: briefing.summary,
                    spoken_briefing: briefing.spoken_briefing,
                    tasks_due_today: briefing.tasks_due_today,
                    overdue_tasks: briefing.overdue_tasks,
                    upcoming_deadlines: briefing.upcoming_deadlines,
                    high_priority_tasks: briefing.high_priority_tasks,
                    scheduled_reminders: briefing.scheduled_reminders,
                    recommended_order: briefing.recommended_order,
                    generated_at: briefing.generated_at,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: err.message || 'Failed to generate briefing.' }) }],
        };
      }
    }
  );

  // Tool 2: list_tasks
  server.tool(
    'list_tasks',
    'Retrieve tasks belonging to the user with filtering by date, status, priority, and project.',
    {
      date: z.string().optional().describe("Filter by date: 'today', 'tomorrow', or ISO/YYYY-MM-DD date"),
      status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional().describe('Filter by task status'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().describe('Filter by task priority'),
      project_id: z.string().optional().describe('Filter by project ID'),
      search: z.string().optional().describe('Search term in title or description'),
      overdue: z.boolean().optional().describe('Filter only overdue tasks'),
      limit: z.number().int().min(1).max(200).optional().default(50).describe('Maximum number of tasks to return (1-200)'),
    },
    async (args) => {
      try {
        const tasks = TasksService.listTasks({
          userId,
          date: args.date,
          status: args.status,
          priority: args.priority,
          projectId: args.project_id,
          search: args.search,
          overdue: args.overdue,
          limit: args.limit,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  count: tasks.length,
                  tasks: tasks.map((t) => ({
                    id: t.id,
                    title: t.title,
                    description: t.description,
                    status: t.status,
                    priority: t.priority,
                    due_date: t.due_date,
                    project_name: t.project_name,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: err.message || 'Failed to list tasks.' }) }],
        };
      }
    }
  );

  // Tool 3: create_task
  server.tool(
    'create_task',
    'Create a new task with a title, description, priority, and optional deadline.',
    {
      title: z.string().min(1, 'Title must not be empty').describe('Title of the task to create'),
      description: z.string().optional().describe('Detailed description of the task'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM').describe('Task priority level'),
      due_date: z.string().optional().describe('ISO 8601 date string for when the task is due (e.g. 2026-10-25T17:00:00Z)'),
      project_id: z.string().optional().describe('Optional ID of an existing project belonging to the user'),
    },
    async (args) => {
      try {
        const created = TasksService.createTask({
          userId,
          title: args.title,
          description: args.description,
          priority: args.priority as any,
          due_date: args.due_date || null,
          project_id: args.project_id || null,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Task '${created.title}' created successfully.`,
                  task: {
                    id: created.id,
                    title: created.title,
                    status: created.status,
                    priority: created.priority,
                    due_date: created.due_date,
                    project_id: created.project_id,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: err.message || 'Failed to create task.' }) }],
        };
      }
    }
  );

  // Tool 4: create_reminder
  server.tool(
    'create_reminder',
    'Create a persistent reminder for a specified date and time linked to an existing or new task.',
    {
      task_id: z.string().optional().describe('ID of the task to remind about'),
      task_title: z.string().optional().describe('Title of the task (used if task_id is omitted)'),
      reminder_time: z.string().min(1, 'Reminder ISO date/time is required').describe('ISO 8601 date string for the reminder'),
      reminder_type: z.enum(['EXACT_TIME', 'DUE_SOON', 'CUSTOM']).optional().default('EXACT_TIME'),
    },
    async (args) => {
      try {
        const reminder = RemindersService.createReminder({
          userId,
          taskId: args.task_id,
          taskTitle: args.task_title,
          reminderTime: args.reminder_time,
          reminderType: args.reminder_type as any,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Reminder scheduled for '${reminder.task_title}' at ${new Date(reminder.reminder_time).toLocaleString()}.`,
                  reminder: {
                    id: reminder.id,
                    task_id: reminder.task_id,
                    task_title: reminder.task_title,
                    reminder_time: reminder.reminder_time,
                    reminder_type: reminder.reminder_type,
                    delivery_status: reminder.delivery_status,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: err.message || 'Failed to create reminder.' }) }],
        };
      }
    }
  );

  // Tool 5: complete_task
  server.tool(
    'complete_task',
    'Mark a task as completed with completion timestamp.',
    {
      task_id: z.string().optional().describe('ID of the task to complete'),
      task_title: z.string().optional().describe('Title or search keyword of the task to complete if ID is not known'),
    },
    async (args) => {
      try {
        const taskId = resolveTaskId(args.task_id, args.task_title);
        const completed = TasksService.completeTask(userId, taskId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Task '${completed.title}' marked as completed!`,
                  task: {
                    id: completed.id,
                    title: completed.title,
                    status: completed.status,
                    completed_at: completed.completed_at,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: err.message || 'Failed to complete task.' }) }],
        };
      }
    }
  );

  // Tool 6: reschedule_task
  server.tool(
    'reschedule_task',
    "Change a task's due date or time with timestamp validation.",
    {
      task_id: z.string().optional().describe('ID of the task to reschedule'),
      task_title: z.string().optional().describe('Title of the task to reschedule if ID is not known'),
      due_date: z.string().min(1, 'New due date is required').describe('New ISO 8601 due date for the task'),
    },
    async (args) => {
      try {
        const taskId = resolveTaskId(args.task_id, args.task_title);
        const rescheduled = TasksService.rescheduleTask(userId, taskId, args.due_date);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Task '${rescheduled.title}' rescheduled to ${new Date(rescheduled.due_date).toLocaleString()}.`,
                  task: {
                    id: rescheduled.id,
                    title: rescheduled.title,
                    due_date: rescheduled.due_date,
                    status: rescheduled.status,
                    priority: rescheduled.priority,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: err.message || 'Failed to reschedule task.' }) }],
        };
      }
    }
  );

  // Tool 7: update_task
  server.tool(
    'update_task',
    'Update task details, status, priority, or due date.',
    {
      task_id: z.string().min(1, 'Task ID is required').describe('ID of the task to update'),
      title: z.string().optional().describe('Updated task title'),
      description: z.string().optional().describe('Updated task description'),
      status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional().describe('Updated task status'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().describe('Updated task priority'),
      due_date: z.string().optional().describe('Updated ISO 8601 due date'),
      project_id: z.string().optional().describe('Updated project ID'),
    },
    async (args) => {
      try {
        const updated = TasksService.updateTask({
          userId,
          taskId: args.task_id,
          title: args.title,
          description: args.description,
          status: args.status as any,
          priority: args.priority as any,
          due_date: args.due_date,
          project_id: args.project_id,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Task '${updated.title}' updated successfully.`,
                  task: {
                    id: updated.id,
                    title: updated.title,
                    status: updated.status,
                    priority: updated.priority,
                    due_date: updated.due_date,
                    completed_at: updated.completed_at,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: err.message || 'Failed to update task.' }) }],
        };
      }
    }
  );

  // Tool 8: snooze_reminder
  server.tool(
    'snooze_reminder',
    'Postpone a reminder by a specified duration in minutes (default 15).',
    {
      reminder_id: z.string().min(1, 'Reminder ID is required'),
      minutes: z.number().int().min(1).max(1440).optional().default(15).describe('Minutes to snooze (1-1440)'),
    },
    async (args) => {
      try {
        const reminder = RemindersService.snoozeReminder({
          userId,
          reminderId: args.reminder_id,
          minutes: args.minutes,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Reminder for '${reminder.task_title}' snoozed by ${args.minutes} minutes.`,
                  reminder: {
                    id: reminder.id,
                    task_title: reminder.task_title,
                    delivery_status: reminder.delivery_status,
                    snooze_until: reminder.snooze_until,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: err.message || 'Failed to snooze reminder.' }) }],
        };
      }
    }
  );

  // Tool 9: list_reminders
  server.tool(
    'list_reminders',
    'Retrieve upcoming, completed, and overdue reminders with their linked task details.',
    {
      status: z.enum(['UPCOMING', 'OVERDUE', 'COMPLETED', 'PENDING', 'SNOOZED', 'DISMISSED', 'ALL']).optional().default('UPCOMING').describe('Status filter: UPCOMING, OVERDUE, COMPLETED, PENDING, SNOOZED, DISMISSED, or ALL'),
      task_id: z.string().optional().describe('Filter by specific task ID'),
      limit: z.number().int().min(1).max(100).optional().default(50).describe('Limit results (1-100)'),
    },
    async (args) => {
      try {
        const reminders = RemindersService.listReminders(userId, {
          taskId: args.task_id,
          status: args.status,
          limit: args.limit,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  count: reminders.length,
                  filter: args.status,
                  reminders: reminders.map((r: any) => ({
                    id: r.id,
                    task_id: r.task_id,
                    task_title: r.task_title,
                    task_status: r.task_status,
                    reminder_time: r.reminder_time,
                    reminder_type: r.reminder_type,
                    delivery_status: r.delivery_status,
                    snooze_until: r.snooze_until,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: err.message || 'Failed to list reminders.' }) }],
        };
      }
    }
  );

  // Tool 10: delete_task
  server.tool(
    'delete_task',
    'Delete a task only after the requested operation has been clearly identified and confirmed.',
    {
      task_id: z.string().optional().describe('ID of the task to delete'),
      task_title: z.string().optional().describe('Title of the task to delete if ID is not known'),
      confirm: z.boolean().describe('Explicit confirmation flag. Must be true to perform deletion.'),
    },
    async (args) => {
      try {
        if (!args.confirm) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: 'Confirmation required: confirm parameter must be true to delete a task.',
                }),
              },
            ],
          };
        }

        const taskId = resolveTaskId(args.task_id, args.task_title);
        const result = TasksService.deleteTask(userId, taskId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Task deleted successfully from database.',
                  task_id: taskId,
                  result,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: err.message || 'Failed to delete task.' }) }],
        };
      }
    }
  );

  // Tool 11 (Bonus): dismiss_reminder
  server.tool(
    'dismiss_reminder',
    'Dismiss an active reminder and clear associated notifications.',
    {
      reminder_id: z.string().min(1, 'Reminder ID is required'),
    },
    async (args) => {
      try {
        const result = RemindersService.dismissReminder(userId, args.reminder_id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: 'Reminder dismissed successfully.', result }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: err.message || 'Failed to dismiss reminder.' }) }],
        };
      }
    }
  );

  return server;
}
