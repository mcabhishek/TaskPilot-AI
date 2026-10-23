import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/database.js';

export interface WorkflowTriggerEvent {
  userId: string;
  triggerType: 'TASK_OVERDUE' | 'TASK_CREATED' | 'STATUS_CHANGED' | 'MILESTONE_REACHED';
  task?: any;
  project?: any;
  milestone?: any;
}

export function evaluateWorkflows(event: WorkflowTriggerEvent): void {
  try {
    const workflows = db.prepare(`
      SELECT * FROM workflows
      WHERE user_id = ? AND is_active = 1 AND trigger_type = ?
    `).all(event.userId, event.triggerType) as any[];

    for (const wf of workflows) {
      let conditionsMet = false;

      // Condition checking
      if (wf.condition_type === 'ALWAYS') {
        conditionsMet = true;
      } else if (wf.condition_type === 'STATUS_NOT_DONE') {
        if (event.task && event.task.status !== 'DONE') {
          conditionsMet = true;
        }
      } else if (wf.condition_type === 'PRIORITY_HIGH') {
        if (event.task && (event.task.priority === 'HIGH' || event.task.priority === 'URGENT')) {
          conditionsMet = true;
        }
      } else {
        conditionsMet = true;
      }

      if (!conditionsMet) continue;

      // Duplicate prevention for overdue reminders: don't notify for the same task twice on the same day
      if (event.triggerType === 'TASK_OVERDUE' && event.task) {
        const recentExecution = db.prepare(`
          SELECT id FROM workflow_executions
          WHERE workflow_id = ? AND trigger_event LIKE ? AND executed_at >= datetime('now', '-24 hours')
        `).get(wf.id, `%${event.task.id}%`);

        if (recentExecution) {
          continue; // Prevent spamming duplicate notifications
        }
      }

      // Execute Action
      let actionTaken = '';
      try {
        if (wf.action_type === 'CREATE_NOTIFICATION') {
          const notifId = uuidv4();
          const taskTitle = event.task?.title || 'a task';
          const notifTitle = event.triggerType === 'TASK_OVERDUE' 
            ? `Task Overdue: "${taskTitle}"` 
            : `Workflow Alert: ${wf.name}`;
          const notifMsg = event.triggerType === 'TASK_OVERDUE'
            ? `The task "${taskTitle}" is overdue. Please review or reschedule it.`
            : `Triggered by ${event.triggerType}: ${taskTitle}`;

          db.prepare(`
            INSERT INTO notifications (id, user_id, title, message, type, link)
            VALUES (?, ?, ?, ?, 'REMINDER', '/tasks')
          `).run(notifId, event.userId, notifTitle, notifMsg);
          actionTaken = `Created in-app notification: ${notifTitle}`;
        } else if (wf.action_type === 'CREATE_TASK') {
          const newTaskId = uuidv4();
          const title = `Follow up on: ${event.task?.title || 'Workflow'}`;
          db.prepare(`
            INSERT INTO tasks (id, user_id, title, description, priority, status)
            VALUES (?, ?, ?, 'Automated follow-up task', 'MEDIUM', 'TODO')
          `).run(newTaskId, event.userId, title);
          actionTaken = `Created follow-up task: ${title}`;
        } else if (wf.action_type === 'UPDATE_PRIORITY') {
          if (event.task) {
            db.prepare(`UPDATE tasks SET priority = 'URGENT' WHERE id = ?`).run(event.task.id);
            actionTaken = `Elevated priority of task ${event.task.id} to URGENT`;
          }
        }

        // Record execution
        const execId = uuidv4();
        db.prepare(`
          INSERT INTO workflow_executions (id, workflow_id, user_id, status, trigger_event, action_taken)
          VALUES (?, ?, ?, 'SUCCESS', ?, ?)
        `).run(execId, wf.id, event.userId, JSON.stringify({ trigger: event.triggerType, taskId: event.task?.id }), actionTaken);

        db.prepare(`
          UPDATE workflows SET run_count = run_count + 1, last_run_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(wf.id);

      } catch (err: any) {
        console.error(`Workflow execution error for ${wf.id}:`, err);
        const execId = uuidv4();
        db.prepare(`
          INSERT INTO workflow_executions (id, workflow_id, user_id, status, trigger_event, error_message)
          VALUES (?, ?, ?, 'FAILED', ?, ?)
        `).run(execId, wf.id, event.userId, JSON.stringify({ trigger: event.triggerType }), err.message);
      }
    }
  } catch (err) {
    console.error('Error evaluating workflows:', err);
  }
}

// Background scanner for overdue tasks
export function checkOverdueTasksAllUsers(): void {
  try {
    const overdueTasks = db.prepare(`
      SELECT * FROM tasks
      WHERE due_date < datetime('now') AND status != 'DONE'
    `).all() as any[];

    for (const task of overdueTasks) {
      evaluateWorkflows({
        userId: task.user_id,
        triggerType: 'TASK_OVERDUE',
        task,
      });
    }
  } catch (err) {
    console.error('Error scanning overdue tasks:', err);
  }
}
