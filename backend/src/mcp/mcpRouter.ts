import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createTaskPilotMcpServer } from './taskpilotMcpServer.js';
import { verifyJwtToken } from '../config/security.js';

export const mcpRouter = Router();

interface McpSessionRecord {
  transport: StreamableHTTPServerTransport;
  userId: string;
  createdAt: number;
  lastActive: number;
  openConnections: number;
}

// Active Streamable HTTP MCP sessions keyed by sessionId
const sessions = new Map<string, McpSessionRecord>();

const IDLE_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_SESSIONS = 1000;

// Periodic cleanup of expired/idle sessions
setInterval(() => {
  const cutoff = Date.now() - IDLE_SESSION_TTL_MS;
  for (const [sessionId, session] of sessions.entries()) {
    if (session.openConnections === 0 && session.lastActive < cutoff) {
      session.transport.close().catch(console.error);
      sessions.delete(sessionId);
    }
  }
}, 60000).unref();

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
    const decoded = verifyJwtToken<{ userId?: string; id?: string; email: string }>(token);
    const uid = decoded?.userId || decoded?.id;
    return uid ? { id: uid, email: decoded.email } : null;
  } catch (err) {
    return null;
  }
}

/**
 * Track open response connections to prevent disconnecting active streams
 */
function trackResponse(session: McpSessionRecord, res: Response) {
  if (!res.socket || res.destroyed) return;
  session.openConnections++;
  res.on('close', () => {
    session.openConnections = Math.max(0, session.openConnections - 1);
    session.lastActive = Date.now();
  });
}

/**
 * GET /mcp/info
 * Public metadata endpoint describing the TaskPilot AI MCP Server capability.
 */
mcpRouter.get('/info', (_req: Request, res: Response) => {
  res.json({
    name: 'TaskPilot-AI-MCP-Server',
    version: '1.0.0',
    specification: 'Model Context Protocol (MCP) Streamable HTTP Transport Specification',
    supportedTransports: ['streamable-http', 'stdio'],
    endpoints: {
      streamableHttp: '/mcp',
      info: '/mcp/info',
      oauthMetadata: '/.well-known/oauth-authorization-server',
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
        description: 'Retrieve tasks with filtering by date, status, priority, and project.',
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
 * POST /mcp (or /)
 * Handles Streamable HTTP initialization and JSON-RPC message calls.
 */
mcpRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const user = authenticateMcpUser(req);
  if (!user) {
    res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Unauthorized: A valid Bearer token or ?token= query parameter is required.' },
      id: null,
    });
    return;
  }

  const sessionId = (req.headers['mcp-session-id'] as string) || (req.query.sessionId as string);

  try {
    let session = sessionId ? sessions.get(sessionId) : undefined;

    // 1. Initialization Request (no session ID provided yet)
    if (!sessionId && isInitializeRequest(req.body)) {
      if (sessions.size >= MAX_SESSIONS) {
        res.status(503).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Server busy: Too many open MCP sessions.' },
          id: null,
        });
        return;
      }

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (newSid) => {
          sessions.set(newSid, {
            transport,
            userId: user.id,
            createdAt: Date.now(),
            lastActive: Date.now(),
            openConnections: 0,
          });
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && sessions.has(sid)) {
          sessions.delete(sid);
        }
      };

      const mcpServer = createTaskPilotMcpServer(user.id);
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    // 2. Existing Session Request
    if (session) {
      // Cross-user session security: verify token user owns this session
      if (session.userId !== user.id) {
        res.status(403).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Forbidden: Session belongs to a different authenticated user.' },
          id: null,
        });
        return;
      }

      session.lastActive = Date.now();
      trackResponse(session, res);
      await session.transport.handleRequest(req, res, req.body);
      return;
    }

    // 3. Invalid or Expired Session ID
    if (sessionId) {
      res.status(404).json({
        jsonrpc: '2.0',
        error: { code: -32001, message: `MCP session '${sessionId}' not found or has expired.` },
        id: null,
      });
      return;
    }

    // 4. Missing Session ID and not an initialize request
    res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Bad Request: No valid session ID provided and message is not an initialization request.' },
      id: null,
    });
  } catch (err: any) {
    console.error('Error handling Streamable HTTP POST /mcp:', err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: err.message || 'Internal error handling Streamable HTTP request.' },
        id: null,
      });
    }
  }
});

/**
 * GET /mcp (or /)
 * Handles Streamable HTTP Server-Sent Events stream for receiving notifications and server messages.
 */
mcpRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const user = authenticateMcpUser(req);
  if (!user) {
    res.status(401).json({
      error: 'Unauthorized: A valid Bearer token or ?token= query parameter is required.',
    });
    return;
  }

  const sessionId = (req.headers['mcp-session-id'] as string) || (req.query.sessionId as string);

  if (!sessionId) {
    res.status(400).json({ error: 'Missing required header or query parameter: mcp-session-id' });
    return;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    res.status(404).json({ error: `MCP session '${sessionId}' not found or has expired.` });
    return;
  }

  // Cross-user session security
  if (session.userId !== user.id) {
    res.status(403).json({ error: 'Forbidden: Session belongs to a different authenticated user.' });
    return;
  }

  try {
    session.lastActive = Date.now();
    trackResponse(session, res);
    await session.transport.handleRequest(req, res);
  } catch (err: any) {
    console.error('Error handling Streamable HTTP GET /mcp:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal error establishing SSE stream.' });
    }
  }
});

/**
 * DELETE /mcp (or /)
 * Handles Streamable HTTP session termination according to official MCP specification.
 */
mcpRouter.delete('/', async (req: Request, res: Response): Promise<void> => {
  const user = authenticateMcpUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const sessionId = (req.headers['mcp-session-id'] as string) || (req.query.sessionId as string);
  if (!sessionId) {
    res.status(400).json({ error: 'Missing required header: mcp-session-id' });
    return;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found or already terminated.' });
    return;
  }

  if (session.userId !== user.id) {
    res.status(403).json({ error: 'Forbidden: Session belongs to a different authenticated user.' });
    return;
  }

  try {
    await session.transport.handleRequest(req, res);
    sessions.delete(sessionId);
  } catch (err: any) {
    console.error('Error deleting MCP session:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error terminating MCP session.' });
    }
  }
});

/**
 * Backward compatibility aliases for legacy clients:
 * /mcp/sse and /mcp/messages
 */
mcpRouter.get('/sse', async (req: Request, res: Response): Promise<void> => {
  // If no session-id is provided, auto-create one for legacy SSE clients
  const user = authenticateMcpUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    onsessioninitialized: (sid) => {
      sessions.set(sid, {
        transport,
        userId: user.id,
        createdAt: Date.now(),
        lastActive: Date.now(),
        openConnections: 0,
      });
    },
  });

  const mcpServer = createTaskPilotMcpServer(user.id);
  await mcpServer.connect(transport);
  await transport.handleRequest(req, res);
});

mcpRouter.post('/messages', async (req: Request, res: Response): Promise<void> => {
  const user = authenticateMcpUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const sessionId = (req.query.sessionId as string) || (req.headers['mcp-session-id'] as string);
  if (!sessionId) {
    res.status(400).json({ error: 'Missing required parameter: sessionId' });
    return;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    res.status(404).json({ error: `MCP session '${sessionId}' not found.` });
    return;
  }

  if (session.userId !== user.id) {
    res.status(403).json({ error: 'Forbidden.' });
    return;
  }

  await session.transport.handleRequest(req, res, req.body);
});
