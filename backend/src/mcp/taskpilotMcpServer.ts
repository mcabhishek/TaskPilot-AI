import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TasksService } from '../modules/tasks/tasksService.js';

/**
 * Creates an official MCP server instance scoped to a specific authenticated user.
 * This guarantees strict tenant isolation: tool executions can only access or mutate
 * the authenticated user's records.
 */
export function createTaskPilotMcpServer(userId: string): McpServer {
  const server = new McpServer({
    name: 'TaskPilot-AI-MCP-Server',
    version: '1.0.0',
  });

  // Tool 1: create_task
  server.tool(
    'create_task',
    'Create a new task with title, description, priority, and due date.',
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
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: false, error: err.message || 'Failed to create task.' }),
            },
          ],
        };
      }
    }
  );

  // Tool 2: list_tasks
  server.tool(
    'list_tasks',
    'List tasks belonging to the authenticated user with optional status, priority, or project filters.',
    {
      status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional().describe('Filter by task status'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().describe('Filter by task priority'),
      project_id: z.string().optional().describe('Filter by project ID'),
      limit: z.number().int().min(1).max(200).optional().default(50).describe('Maximum number of tasks to return (1-200)'),
    },
    async (args) => {
      try {
        const tasks = TasksService.listTasks({
          userId,
          status: args.status,
          priority: args.priority,
          projectId: args.project_id,
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
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: false, error: err.message || 'Failed to list tasks.' }),
            },
          ],
        };
      }
    }
  );

  // Tool 3: update_task
  server.tool(
    'update_task',
    'Update fields on an existing task belonging to the user.',
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
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: false, error: err.message || 'Failed to update task.' }),
            },
          ],
        };
      }
    }
  );

  // Tool 4: complete_task
  server.tool(
    'complete_task',
    'Mark an existing task as completed with completion timestamp.',
    {
      task_id: z.string().min(1, 'Task ID is required').describe('ID of the task to complete'),
    },
    async (args) => {
      try {
        const completed = TasksService.completeTask(userId, args.task_id);

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
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: false, error: err.message || 'Failed to complete task.' }),
            },
          ],
        };
      }
    }
  );

  return server;
}
