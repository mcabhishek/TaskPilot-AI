import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { db } from '../db/database.js';

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

interface UserClientSession {
  client: Client;
  transport: SSEClientTransport;
  userId: string;
  connectedAt: number;
  lastActive: number;
}

// Session store for official MCP client instances per user token
const clientSessions = new Map<string, UserClientSession>();

/**
 * Official MCP Client Manager.
 * Communicates with the TaskPilot MCP Server strictly over Streamable HTTP (SSE Transport).
 */
export class McpClientManager {
  /**
   * Get or create a connected official MCP Client over Streamable HTTP SSE.
   */
  static async getClient(token: string, userId: string): Promise<Client> {
    const existing = clientSessions.get(userId);
    if (existing) {
      existing.lastActive = Date.now();
      return existing.client;
    }

    const sseUrl = new URL(`${BASE_URL}/mcp/sse`);
    sseUrl.searchParams.set('token', token);

    const transport = new SSEClientTransport(sseUrl);
    const client = new Client(
      {
        name: 'TaskPilot-Alexa-Simulator-Client',
        version: '1.0.0',
      },
      { capabilities: {} }
    );

    await client.connect(transport);

    clientSessions.set(userId, {
      client,
      transport,
      userId,
      connectedAt: Date.now(),
      lastActive: Date.now(),
    });

    return client;
  }

  /**
   * Discover registered tools using the official MCP 'tools/list' protocol.
   */
  static async listTools(token: string, userId: string) {
    const client = await McpClientManager.getClient(token, userId);
    const result = await client.listTools();
    return result.tools;
  }

  /**
   * Execute an MCP tool using the official 'tools/call' protocol.
   */
  static async callTool(token: string, userId: string, name: string, args: Record<string, any>) {
    const startTime = Date.now();
    const client = await McpClientManager.getClient(token, userId);

    try {
      const response = await client.callTool({
        name,
        arguments: args,
      });

      const durationMs = Date.now() - startTime;
      let parsedContent: any = null;

      if (response && (response as any).content && (response as any).content[0]) {
        try {
          parsedContent = JSON.parse((response as any).content[0].text);
        } catch {
          parsedContent = (response as any).content[0].text;
        }
      }

      return {
        toolName: name,
        arguments: args,
        transport: 'streamable-http-sse',
        durationMs,
        isError: !!response.isError,
        rawResponse: response,
        parsedContent,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      return {
        toolName: name,
        arguments: args,
        transport: 'streamable-http-sse',
        durationMs,
        isError: true,
        error: err.message || 'MCP tool execution failed',
      };
    }
  }
}

/**
 * Pending conversational confirmation state for multi-turn Alexa interactions.
 */
interface PendingAction {
  intent: string;
  toolName: string;
  args: Record<string, any>;
  prompt: string;
  createdAt: number;
}

const pendingActions = new Map<string, PendingAction>();

/**
 * Natural Language Orchestrator that maps voice/text requests to official MCP tool calls.
 */
export class McpAssistantEngine {
  static async processRequest(userId: string, token: string, input: string) {
    const text = input ? input.trim() : '';
    const lower = text.toLowerCase();

    // Check if there is an active pending confirmation (e.g. "yes", "save it", "sure", "cancel")
    const pending = pendingActions.get(userId);
    if (pending && Date.now() - pending.createdAt < 120000) { // 2 minute window
      if (
        lower === 'yes' ||
        lower === 'yeah' ||
        lower === 'sure' ||
        lower === 'save it' ||
        lower === 'confirm' ||
        lower === 'yes please' ||
        lower === 'do it' ||
        lower.startsWith('yes')
      ) {
        pendingActions.delete(userId);
        // Execute the confirmed pending MCP tool
        const mcpTrace = await McpClientManager.callTool(token, userId, pending.toolName, pending.args);
        
        let spoken = '';
        if (mcpTrace.isError) {
          spoken = `Sorry, I encountered an error: ${mcpTrace.parsedContent?.error || mcpTrace.error || 'Operation failed'}`;
        } else if (pending.toolName === 'create_reminder') {
          spoken = `I've saved your reminder for "${mcpTrace.parsedContent?.reminder?.task_title}" successfully.`;
        } else if (pending.toolName === 'delete_task') {
          spoken = `The task has been permanently deleted as requested.`;
        } else {
          spoken = mcpTrace.parsedContent?.message || 'Operation completed successfully.';
        }

        return {
          user_input: text,
          spoken_response: spoken,
          display_text: spoken,
          tool_executed: pending.toolName,
          mcp_trace: mcpTrace,
          requires_confirmation: false,
        };
      } else if (lower === 'no' || lower === 'cancel' || lower === 'stop' || lower === 'nevermind') {
        pendingActions.delete(userId);
        return {
          user_input: text,
          spoken_response: 'Cancelled. I did not make any changes.',
          display_text: 'Action cancelled by user.',
          requires_confirmation: false,
        };
      }
    }

    // 1. Get Daily Briefing / Agenda
    if (
      lower.includes('briefing') ||
      lower.includes('what do i need to do') ||
      lower.includes('what to do today') ||
      lower.includes('what do i need to finish') ||
      lower.includes('my agenda') ||
      lower.includes('plan my day')
    ) {
      const mcpTrace = await McpClientManager.callTool(token, userId, 'get_daily_briefing', {});
      const briefing = mcpTrace.parsedContent?.briefing;
      const spoken = briefing?.spoken_briefing || 'Loaded your daily briefing.';

      return {
        user_input: text,
        spoken_response: spoken,
        display_text: briefing?.headline || 'Daily Briefing',
        tool_executed: 'get_daily_briefing',
        mcp_trace: mcpTrace,
        data: briefing,
      };
    }

    // 2. Create Reminder Intent (with confirmation flow)
    if (lower.includes('remind me') || lower.includes('set reminder') || lower.includes('create reminder')) {
      let minutes = 30;
      let reminderDate = new Date(Date.now() + 30 * 60 * 1000);

      const minMatch = lower.match(/(\d+)\s*(?:minute|min|m)/);
      const hourMatch = lower.match(/(\d+)\s*(?:hour|hr|h)/);
      const timeMatch = lower.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);

      if (lower.includes('tomorrow')) {
        reminderDate = new Date();
        reminderDate.setDate(reminderDate.getDate() + 1);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const meridian = timeMatch[3].toLowerCase();
          if (meridian === 'pm' && hours < 12) hours += 12;
          if (meridian === 'am' && hours === 12) hours = 0;
          reminderDate.setHours(hours, mins, 0, 0);
        } else {
          reminderDate.setHours(9, 0, 0, 0); // default tomorrow 9 AM
        }
      } else if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const meridian = timeMatch[3].toLowerCase();
        if (meridian === 'pm' && hours < 12) hours += 12;
        if (meridian === 'am' && hours === 12) hours = 0;
        reminderDate.setHours(hours, mins, 0, 0);
        if (reminderDate.getTime() < Date.now()) {
          // If time passed today, set to tomorrow
          reminderDate.setDate(reminderDate.getDate() + 1);
        }
      } else if (minMatch) {
        minutes = parseInt(minMatch[1], 10);
        reminderDate = new Date(Date.now() + minutes * 60 * 1000);
      } else if (hourMatch) {
        minutes = parseInt(hourMatch[1], 10) * 60;
        reminderDate = new Date(Date.now() + minutes * 60 * 1000);
      }

      // Clean task title
      let title = lower
        .replace(/remind me to/g, '')
        .replace(/remind me about/g, '')
        .replace(/remind me/g, '')
        .replace(/set reminder for/g, '')
        .replace(/set reminder/g, '')
        .replace(/create reminder for/g, '')
        .replace(/create reminder/g, '')
        .replace(/tomorrow/g, '')
        .replace(/at \d{1,2}(?::\d{2})?\s*(?:am|pm)?/gi, '')
        .replace(/in \d+\s*(?:minutes?|hours?|mins?|hrs?)/gi, '')
        .trim();

      if (!title || title.length < 2) {
        title = 'Important deliverable';
      }
      const formattedTitle = title.charAt(0).toUpperCase() + title.slice(1);
      const isoTime = reminderDate.toISOString();
      const readableTime = reminderDate.toLocaleString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

      // Set pending action for confirmation
      pendingActions.set(userId, {
        intent: 'CREATE_REMINDER',
        toolName: 'create_reminder',
        args: {
          task_title: formattedTitle,
          reminder_time: isoTime,
          reminder_type: 'CUSTOM',
        },
        prompt: `I'll create a reminder for "${formattedTitle}" scheduled for ${readableTime}. Would you like me to save it?`,
        createdAt: Date.now(),
      });

      return {
        user_input: text,
        spoken_response: `I'll create a reminder for "${formattedTitle}" scheduled for ${readableTime}. Would you like me to save it?`,
        display_text: `Confirmation Required: Schedule reminder for "${formattedTitle}" at ${readableTime}? (Say "Yes" or "No")`,
        requires_confirmation: true,
        proposed_action: {
          tool: 'create_reminder',
          task_title: formattedTitle,
          reminder_time: isoTime,
          readable_time: readableTime,
        },
      };
    }

    // 3. Reschedule Task Intent
    if (lower.includes('reschedule') || (lower.includes('move') && lower.includes('to'))) {
      let targetKeyword = lower
        .replace(/reschedule task/g, '')
        .replace(/reschedule/g, '')
        .replace(/move task/g, '')
        .replace(/to .*$/g, '')
        .trim();

      let newDate = new Date(Date.now() + 86400000 * 2); // default 2 days out
      if (lower.includes('tomorrow')) {
        newDate = new Date(Date.now() + 86400000);
      } else if (lower.includes('next week')) {
        newDate = new Date(Date.now() + 86400000 * 7);
      } else if (lower.includes('friday')) {
        newDate = new Date(Date.now() + 86400000 * 3);
      }

      const mcpTrace = await McpClientManager.callTool(token, userId, 'reschedule_task', {
        task_title: targetKeyword || undefined,
        due_date: newDate.toISOString(),
      });

      const spoken = mcpTrace.isError
        ? `Could not reschedule: ${mcpTrace.parsedContent?.error || mcpTrace.error}`
        : mcpTrace.parsedContent?.message || 'Task rescheduled successfully.';

      return {
        user_input: text,
        spoken_response: spoken,
        display_text: spoken,
        tool_executed: 'reschedule_task',
        mcp_trace: mcpTrace,
      };
    }

    // 4. Complete Task Intent
    if (
      (lower.includes('mark') && (lower.includes('done') || lower.includes('complete'))) ||
      lower.startsWith('complete task') ||
      lower.startsWith('finish task')
    ) {
      const keyword = lower
        .replace(/mark/g, '')
        .replace(/as done/g, '')
        .replace(/as completed/g, '')
        .replace(/complete task/g, '')
        .replace(/finish task/g, '')
        .trim();

      const mcpTrace = await McpClientManager.callTool(token, userId, 'complete_task', {
        task_title: keyword || undefined,
      });

      const spoken = mcpTrace.isError
        ? `Could not complete task: ${mcpTrace.parsedContent?.error || mcpTrace.error}`
        : mcpTrace.parsedContent?.message || 'Task completed successfully!';

      return {
        user_input: text,
        spoken_response: spoken,
        display_text: spoken,
        tool_executed: 'complete_task',
        mcp_trace: mcpTrace,
      };
    }

    // 5. Create Task Intent
    if (lower.startsWith('create task') || lower.startsWith('add task') || lower.startsWith('new task')) {
      let title = lower
        .replace(/create task/g, '')
        .replace(/add task/g, '')
        .replace(/new task/g, '')
        .trim();

      let priority = 'MEDIUM';
      if (lower.includes('urgent')) priority = 'URGENT';
      else if (lower.includes('high priority')) priority = 'HIGH';
      else if (lower.includes('low priority')) priority = 'LOW';

      title = title.replace(/with (urgent|high|medium|low) priority/gi, '').trim();
      const formattedTitle = title ? title.charAt(0).toUpperCase() + title.slice(1) : 'New Productivity Task';

      const mcpTrace = await McpClientManager.callTool(token, userId, 'create_task', {
        title: formattedTitle,
        priority,
        due_date: new Date(Date.now() + 86400000).toISOString(),
      });

      const spoken = mcpTrace.isError
        ? `Failed to create task: ${mcpTrace.parsedContent?.error || mcpTrace.error}`
        : `I've created the task "${formattedTitle}" with ${priority} priority.`;

      return {
        user_input: text,
        spoken_response: spoken,
        display_text: spoken,
        tool_executed: 'create_task',
        mcp_trace: mcpTrace,
      };
    }

    // 6. Delete Task Intent (with confirmation)
    if (lower.includes('delete task') || lower.includes('remove task')) {
      const keyword = lower
        .replace(/delete task/g, '')
        .replace(/remove task/g, '')
        .trim();

      // Find matching task to ask confirmation
      const match = db.prepare(`
        SELECT id, title FROM tasks
        WHERE user_id = ? AND (title LIKE ? OR description LIKE ?)
        ORDER BY updated_at DESC LIMIT 1
      `).get(userId, `%${keyword}%`, `%${keyword}%`) as any;

      if (!match) {
        return {
          user_input: text,
          spoken_response: `I couldn't find a task matching "${keyword}" to delete.`,
          display_text: 'No matching task found.',
        };
      }

      pendingActions.set(userId, {
        intent: 'DELETE_TASK',
        toolName: 'delete_task',
        args: {
          task_id: match.id,
          confirm: true,
        },
        prompt: `Are you sure you want to permanently delete "${match.title}"? Say "Yes" to confirm or "No" to cancel.`,
        createdAt: Date.now(),
      });

      return {
        user_input: text,
        spoken_response: `Are you sure you want to permanently delete "${match.title}"? Please confirm with "Yes".`,
        display_text: `Confirmation Required: Delete task "${match.title}"?`,
        requires_confirmation: true,
      };
    }

    // 7. List Reminders Intent
    if (lower.includes('reminders') || lower.includes('list reminders') || lower.includes('show reminders')) {
      const mcpTrace = await McpClientManager.callTool(token, userId, 'list_reminders', {
        status: 'UPCOMING',
        limit: 10,
      });

      const reminders = mcpTrace.parsedContent?.reminders || [];
      const spoken = reminders.length > 0
        ? `You have ${reminders.length} upcoming reminder${reminders.length > 1 ? 's' : ''}, starting with "${reminders[0].task_title}".`
        : 'You have no upcoming reminders scheduled.';

      return {
        user_input: text,
        spoken_response: spoken,
        display_text: `Found ${reminders.length} upcoming reminders.`,
        tool_executed: 'list_reminders',
        mcp_trace: mcpTrace,
        data: reminders,
      };
    }

    // 8. Snooze Reminder Intent
    if (lower.includes('snooze')) {
      let minutes = 15;
      const match = lower.match(/(\d+)\s*(?:minute|min|m)/);
      if (match) minutes = parseInt(match[1], 10);

      // Grab latest active reminder
      const latest = db.prepare(`
        SELECT id, task_id FROM reminders
        WHERE user_id = ?
        ORDER BY updated_at DESC LIMIT 1
      `).get(userId) as any;

      if (!latest) {
        return {
          user_input: text,
          spoken_response: 'You have no recent reminders to snooze.',
          display_text: 'No active reminder found.',
        };
      }

      const mcpTrace = await McpClientManager.callTool(token, userId, 'snooze_reminder', {
        reminder_id: latest.id,
        minutes,
      });

      const spoken = mcpTrace.isError
        ? `Could not snooze reminder: ${mcpTrace.parsedContent?.error || mcpTrace.error}`
        : `Snoozed your reminder by ${minutes} minutes.`;

      return {
        user_input: text,
        spoken_response: spoken,
        display_text: spoken,
        tool_executed: 'snooze_reminder',
        mcp_trace: mcpTrace,
      };
    }

    // 9. List Tasks Intent (with optional date filtering)
    if (lower.includes('list tasks') || lower.includes('show tasks') || lower.includes('my tasks') || lower.includes('what tasks')) {
      let dateFilter: string | undefined = undefined;
      if (lower.includes('today')) dateFilter = 'today';
      if (lower.includes('tomorrow')) dateFilter = 'tomorrow';

      const mcpTrace = await McpClientManager.callTool(token, userId, 'list_tasks', {
        date: dateFilter,
        limit: 10,
      });

      const tasks = mcpTrace.parsedContent?.tasks || [];
      const titles = tasks.slice(0, 3).map((t: any) => t.title).join(', ');
      const spoken = tasks.length > 0
        ? `You have ${tasks.length} task${tasks.length > 1 ? 's' : ''}${dateFilter ? ` for ${dateFilter}` : ''}, including: ${titles}.`
        : `You have no tasks${dateFilter ? ` scheduled for ${dateFilter}` : ''}.`;

      return {
        user_input: text,
        spoken_response: spoken,
        display_text: `Found ${tasks.length} tasks.`,
        tool_executed: 'list_tasks',
        mcp_trace: mcpTrace,
        data: tasks,
      };
    }

    // Fallback: general guidance
    return {
      user_input: text,
      spoken_response: `I'm your TaskPilot MCP Assistant. You can say: "Give me my daily briefing", "Remind me to submit project tomorrow at 9 AM", "Reschedule task to Friday", "Create task review metrics", or "Show my upcoming reminders".`,
      display_text: 'Available Commands: Daily Briefing, Set Reminder, Reschedule Task, Complete Task, Create Task, List Reminders',
      requires_confirmation: false,
    };
  }
}
