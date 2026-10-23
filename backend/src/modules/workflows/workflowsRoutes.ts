import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/database.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';
import { evaluateWorkflows, checkOverdueTasksAllUsers } from './workflowEngine.js';

export const workflowsRouter = Router();
workflowsRouter.use(authMiddleware);

// Get user workflows
workflowsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  try {
    const workflows = db.prepare(`
      SELECT w.*,
        (SELECT COUNT(*) FROM workflow_executions WHERE workflow_id = w.id) as total_runs,
        (SELECT executed_at FROM workflow_executions WHERE workflow_id = w.id ORDER BY executed_at DESC LIMIT 1) as last_execution_time
      FROM workflows w
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `).all(userId);
    res.json(workflows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch workflows.' });
  }
});

// Create workflow
workflowsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { name, description, trigger_type, condition_type, action_type, trigger_config, condition_config, action_config } = req.body;

  if (!name || !trigger_type || !action_type) {
    res.status(400).json({ error: 'Name, trigger type, and action type are required.' });
    return;
  }

  const wfId = uuidv4();
  try {
    db.prepare(`
      INSERT INTO workflows (id, user_id, name, description, trigger_type, condition_type, action_type, trigger_config, condition_config, action_config, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      wfId,
      userId,
      name.trim(),
      description || '',
      trigger_type,
      condition_type || 'ALWAYS',
      action_type,
      JSON.stringify(trigger_config || {}),
      JSON.stringify(condition_config || {}),
      JSON.stringify(action_config || {})
    );

    const created = db.prepare('SELECT * FROM workflows WHERE id = ?').get(wfId);
    res.status(201).json(created);
  } catch (err) {
    console.error('Workflow creation error:', err);
    res.status(500).json({ error: 'Failed to create workflow.' });
  }
});

// Toggle workflow active status
workflowsRouter.post('/:id/toggle', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const wf = db.prepare('SELECT * FROM workflows WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!wf) {
      res.status(404).json({ error: 'Workflow not found.' });
      return;
    }

    const nextState = wf.is_active === 1 ? 0 : 1;
    db.prepare('UPDATE workflows SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(nextState, id);
    res.json({ id, is_active: nextState });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle workflow.' });
  }
});

// Test trigger workflow manually
workflowsRouter.post('/:id/trigger', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const wf = db.prepare('SELECT * FROM workflows WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!wf) {
      res.status(404).json({ error: 'Workflow not found.' });
      return;
    }

    // Trigger test event
    evaluateWorkflows({
      userId,
      triggerType: wf.trigger_type,
      task: { id: 'manual-test-sample', title: 'Sample Manual Trigger Task', status: 'TODO', priority: 'HIGH' },
    });

    res.json({ message: 'Workflow manually tested and executed.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to test workflow.' });
  }
});

// Run scan for overdue tasks
workflowsRouter.post('/scan-overdue', (_req: AuthenticatedRequest, res: Response) => {
  try {
    checkOverdueTasksAllUsers();
    res.json({ message: 'Overdue scan completed and automated actions evaluated.' });
  } catch (err) {
    res.status(500).json({ error: 'Scan failed.' });
  }
});

// Delete workflow
workflowsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    db.prepare('DELETE FROM workflows WHERE id = ? AND user_id = ?').run(id, userId);
    res.json({ message: 'Workflow deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete workflow.' });
  }
});

// Get workflow execution logs
workflowsRouter.get('/executions', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  try {
    const logs = db.prepare(`
      SELECT e.*, w.name as workflow_name
      FROM workflow_executions e
      LEFT JOIN workflows w ON e.workflow_id = w.id
      WHERE e.user_id = ?
      ORDER BY e.executed_at DESC
      LIMIT 25
    `).all(userId);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch execution logs.' });
  }
});
