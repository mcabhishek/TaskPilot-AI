import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db/database.js';
import { seedDemoData } from './db/seed.js';
import {
  getJwtSecret,
  getAllowedOrigins,
  securityHeadersMiddleware,
  createRateLimiter,
} from './config/security.js';
import { authRouter } from './modules/auth/authRoutes.js';
import { dashboardRouter } from './modules/dashboard/dashboardRoutes.js';
import { tasksRouter } from './modules/tasks/tasksRoutes.js';
import { projectsRouter } from './modules/projects/projectsRoutes.js';
import { aiRouter } from './modules/ai/aiRoutes.js';
import { calendarRouter } from './modules/calendar/calendarRoutes.js';
import { notesRouter } from './modules/notes/notesRoutes.js';
import { workflowsRouter } from './modules/workflows/workflowsRoutes.js';
import { analyticsRouter } from './modules/analytics/analyticsRoutes.js';
import { notificationsRouter } from './modules/notifications/notificationsRoutes.js';
import { integrationsRouter } from './modules/integrations/integrationsRoutes.js';
import { settingsRouter } from './modules/settings/settingsRoutes.js';
import { mcpRouter } from './mcp/mcpRouter.js';
import { remindersRouter } from './modules/reminders/remindersRoutes.js';
import { briefingRouter } from './modules/briefing/briefingRoutes.js';
import { assistantRouter } from './modules/assistant/assistantRoutes.js';
import { mcpClientRouter } from './mcp/mcpClientRouter.js';
import { oauthRouter } from './modules/auth/oauthRoutes.js';
import { checkOverdueTasksAllUsers } from './modules/workflows/workflowEngine.js';
import { RemindersService } from './modules/reminders/remindersService.js';

dotenv.config();

// Enforce production security check: fails immediately at startup if JWT secret is missing or insecure
getJwtSecret();

const app = express();
const PORT = process.env.PORT || 5000;

// Apply security headers (X-Content-Type-Options, X-Frame-Options, XSS, Referrer-Policy)
app.use(securityHeadersMiddleware);

// Configurable CORS allowlist: permits allowed frontend origins without wildcard credentials vulnerability
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. CLI tools, curl, native agents, tests)
      if (!origin) return callback(null, true);

      const allowed = getAllowedOrigins();
      if (allowed.includes(origin) || allowed.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy violation: Origin '${origin}' is not in the allowed origins list.`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'mcp-session-id', 'last-event-id'],
    exposedHeaders: ['mcp-session-id', 'Retry-After'],
    credentials: true,
  })
);

// Body parser with 1MB payload size limit to prevent denial of service attacks
app.use(express.json({ limit: '1mb' }));

// Initialize database schema and seed demo records if needed
initDatabase();
seedDemoData();

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    application: 'TaskPilot AI',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Auth rate limiter: 100 requests per 15 minutes for registration and login
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100,
  message: 'Too many authentication attempts. Please try again later.',
});

// API Routes
app.use('/api/v1/auth', authRateLimiter, authRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/tasks', tasksRouter);
app.use('/api/v1/projects', projectsRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/calendar', calendarRouter);
app.use('/api/v1/notes', notesRouter);
app.use('/api/v1/workflows', workflowsRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/integrations', integrationsRouter);
app.use('/api/v1/settings', settingsRouter);

// Smart Reminders, Daily Briefings, and Alexa-Style Assistant routes
app.use('/api/v1/reminders', remindersRouter);
app.use('/api/v1/briefing', briefingRouter);
app.use('/api/v1/assistant', assistantRouter);

// Model Context Protocol (MCP) Streamable HTTP routes
app.use('/mcp', mcpRouter);
app.use('/api/v1/mcp', mcpRouter);

// Official MCP Client Bridge & Simulator endpoints
app.use('/api/v1/mcp-client', mcpClientRouter);

// OAuth 2.1 RFC 8414 Metadata & Authorization Server endpoints (Alexa+ interoperability)
app.use('/', oauthRouter);
app.use('/oauth', oauthRouter);

// Centralized error handling
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err.message || err);
  const isProd = process.env.NODE_ENV === 'production';
  const statusCode = err.status || (err.message && err.message.includes('CORS') ? 403 : 500);
  res.status(statusCode).json({
    error: isProd ? 'Internal server error occurred.' : (err.message || 'Internal server error occurred.'),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TaskPilot AI Backend listening on http://localhost:${PORT}`);
  console.log(`🤖 MCP Server Streamable HTTP endpoint: http://localhost:${PORT}/mcp`);

  // Background periodic scanner: runs every 15 seconds to deliver due reminders idempotently
  setInterval(() => {
    try {
      RemindersService.processDueReminders();
    } catch (err) {
      console.error('Error running reminder scanner:', err);
    }
  }, 15000);

  // Background periodic scanner: runs every 60 seconds to detect overdue tasks and evaluate workflows
  setInterval(() => {
    try {
      checkOverdueTasksAllUsers();
    } catch (err) {
      console.error('Error running overdue workflow scanner:', err);
    }
  }, 60000);
});
