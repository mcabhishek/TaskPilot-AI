import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createTaskPilotMcpServer } from './taskpilotMcpServer.js';

const JWT_SECRET = process.env.JWT_SECRET || 'taskpilot-super-secret-jwt-key-2026';

export const mcpRouter = Router();

interface McpSession {
  transport: SSEServerTransport;
  userId: string;
  createdAt: string;
}

// In-memory active SSE transport sessions keyed by transport.sessionId
const activeSessions = new Map<string, McpSession>();

/**
 * Authentication helper for MCP requests.
 * Extracts and verifies JWT from Bearer header or query parameter.
 */
function authenticateMcpUser(req: Request): { id: string; email: string } | null {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const uid = decoded?.userId || decoded?.id;
    return uid ? { id: uid, email: decoded.email } : null;
  } catch (err) {
    return null;
  }
}

/**
 * GET /mcp/info
 * Public metadata endpoint describing the TaskPilot AI MCP Server capability.
 */
mcpRouter.get('/info', (_req: Request, res: Response) => {
  res.json({
    name: 'TaskPilot-AI-MCP-Server',
    version: '1.0.0',
    specification: 'Model Context Protocol (MCP) 2025-11-25 / SDK 1.32.1',
    supportedTransports: ['streamable-http-sse', 'stdio'],
    endpoints: {
      sse: '/mcp/sse',
      messages: '/mcp/messages?sessionId={id}',
      info: '/mcp/info',
    },
    authentication: 'Bearer JWT token via Authorization header or ?token query param',
    tools: [
      {
        name: 'get_daily_briefing',
        description: "Return today's tasks, upcoming deadlines, overdue tasks, and reminders.",
        parameters: [],
      },
      {
        name: 'list_tasks',
        description: 'Retrieve tasks with filtering by date, status, and priority.',
        parameters: ['date', 'status', 'priority', 'project_id', 'search', 'overdue', 'limit'],
      },
      {
        name: 'create_task',
        description: 'Create a task with a title, description, priority, and optional deadline.',
        parameters: ['title', 'description', 'priority', 'due_date', 'project_id'],
      },
      {
        name: 'create_reminder',
        description: 'Create a persistent reminder for a specified date and time.',
        parameters: ['task_id', 'task_title', 'reminder_time', 'reminder_type'],
      },
      {
        name: 'complete_task',
        description: 'Mark a task as completed.',
        parameters: ['task_id', 'task_title'],
      },
      {
        name: 'reschedule_task',
        description: "Change a task's due date or time.",
        parameters: ['task_id', 'task_title', 'due_date'],
      },
      {
        name: 'update_task',
        description: 'Update task details or priority.',
        parameters: ['task_id', 'title', 'description', 'status', 'priority', 'due_date', 'project_id'],
      },
      {
        name: 'snooze_reminder',
        description: 'Postpone a reminder by a specified duration.',
        parameters: ['reminder_id', 'minutes'],
      },
      {
        name: 'list_reminders',
        description: 'Retrieve upcoming, completed, and overdue reminders.',
        parameters: ['status', 'task_id', 'limit'],
      },
      {
        name: 'delete_task',
        description: 'Delete a task only after the requested operation has been clearly identified and validated.',
        parameters: ['task_id', 'task_title', 'confirm'],
      },
      {
        name: 'dismiss_reminder',
        description: 'Dismiss an active reminder and clear associated notifications.',
        parameters: ['reminder_id'],
      },
    ],
  });
});

/**
 * GET /mcp/sse
 * Starts a Streamable HTTP (Server-Sent Events) connection for an authenticated client.
 */
mcpRouter.get('/sse', async (req: Request, res: Response) => {
  const user = authenticateMcpUser(req);
  if (!user) {
    res.status(401).json({
      error: 'Unauthorized: A valid Bearer token or ?token= query parameter is required to connect to the MCP server.',
    });
    return;
  }

  try {
    const transport = new SSEServerTransport('/mcp/messages', res);
    const mcpServer = createTaskPilotMcpServer(user.id);

    activeSessions.set(transport.sessionId, {
      transport,
      userId: user.id,
      createdAt: new Date().toISOString(),
    });

    res.on('close', () => {
      activeSessions.delete(transport.sessionId);
    });

    await mcpServer.connect(transport);
  } catch (err: any) {
    console.error('Error establishing MCP SSE connection:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to establish MCP SSE stream.' });
    }
  }
});

/**
 * POST /mcp/messages
 * Ingests JSON-RPC 2.0 messages from the client and routes them to the associated session transport.
 */
mcpRouter.post('/messages', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    res.status(400).json({ error: 'Missing required query parameter: sessionId' });
    return;
  }

  const session = activeSessions.get(sessionId);
  if (!session) {
    res.status(404).json({ error: `MCP session '${sessionId}' not found or has expired.` });
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res, req.body);
  } catch (err: any) {
    console.error(`Error handling message for MCP session ${sessionId}:`, err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal error processing MCP message.' });
    }
  }
});
