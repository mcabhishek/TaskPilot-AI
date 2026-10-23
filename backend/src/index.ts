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
import { checkOverdueTasksAllUsers } from './modules/workflows/workflowEngine.js';

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

// Centralized error handling
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error occurred.' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TaskPilot AI Backend listening on http://localhost:${PORT}`);
  
  // Background periodic scanner: runs every 60 seconds to detect overdue tasks and evaluate workflows
  setInterval(() => {
    checkOverdueTasksAllUsers();
  }, 60000);
});
