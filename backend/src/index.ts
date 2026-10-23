import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db/database.js';
import { seedDemoData } from './db/seed.js';
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

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Initialize database schema and seed initial data
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

// API Routes
app.use('/api/v1/auth', authRouter);
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
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error occurred.' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TaskPilot AI Backend listening on http://localhost:${PORT}`);
  
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
