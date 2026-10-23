import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, initDatabase } from './database.js';

export function seedDemoData(force = false) {
  initDatabase();

  const demoEmail = 'demo@taskpilot.ai';
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(demoEmail) as any;

  if (existingUser && !force) {
    return; // Already seeded and not forced
  }

  if (existingUser && force) {
    db.prepare('DELETE FROM users WHERE id = ?').run(existingUser.id);
  }

  const userId = uuidv4();
  const passwordHash = bcrypt.hashSync('demo12345', 10);
  const now = new Date();

  console.log('Seeding clean, professional workspace records for TaskPilot AI...');

  db.transaction(() => {
    // 1. User & Preferences
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, timezone, theme)
      VALUES (?, 'Alex Rivera', ?, ?, 'America/New_York', 'light')
    `).run(userId, demoEmail, passwordHash);

    db.prepare(`
      INSERT INTO user_preferences (user_id, daily_task_goal, ai_suggestions_enabled)
      VALUES (?, 6, 1)
    `).run(userId);

    // 2. Professional Projects
    const p1Id = uuidv4();
    db.prepare(`
      INSERT INTO projects (id, user_id, name, description, color, deadline)
      VALUES (?, ?, 'TaskPilot AI — Hackathon Launch', 'Production deployment, Model Context Protocol server, and Devpost submission.', '#F97316', ?)
    `).run(p1Id, userId, new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString());

    const p2Id = uuidv4();
    db.prepare(`
      INSERT INTO projects (id, user_id, name, description, color, deadline)
      VALUES (?, ?, 'Academic & Systems Research', 'Distributed database architecture and socket network performance revision.', '#EA580C', ?)
    `).run(p2Id, userId, new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString());

    // Milestones
    const m1Id = uuidv4();
    db.prepare(`
      INSERT INTO project_milestones (id, project_id, title, due_date, status, order_index)
      VALUES (?, ?, 'Core Workspace & Database Schema', ?, 'COMPLETED', 0)
    `).run(m1Id, p1Id, new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString());

    const m2Id = uuidv4();
    db.prepare(`
      INSERT INTO project_milestones (id, project_id, title, due_date, status, order_index)
      VALUES (?, ?, 'MCP Server & Alexa-Style Simulator', ?, 'PENDING', 1)
    `).run(m2Id, p1Id, new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString());

    // 3. Realistic Professional Tasks
    const t1Id = uuidv4();
    db.prepare(`
      INSERT INTO tasks (id, user_id, project_id, milestone_id, title, description, status, priority, due_date, estimated_duration, tags)
      VALUES (?, ?, ?, ?, 'Deploy AI Goal Planner & Structured JSON Validation', 'Connect backend intelligent planner and review modal for human approval.', 'IN_PROGRESS', 'URGENT', ?, 90, ?)
    `).run(t1Id, userId, p1Id, m2Id, new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(), JSON.stringify(['ai', 'mcp', 'backend']));

    const sub1Id = uuidv4();
    db.prepare('INSERT INTO subtasks (id, task_id, title, is_completed) VALUES (?, ?, ?, 1)').run(sub1Id, t1Id, 'Implement AI planner endpoint');
    const sub2Id = uuidv4();
    db.prepare('INSERT INTO subtasks (id, task_id, title, is_completed) VALUES (?, ?, ?, 0)').run(sub2Id, t1Id, 'Integrate review modal on frontend');

    const t2Id = uuidv4();
    db.prepare(`
      INSERT INTO tasks (id, user_id, project_id, title, description, status, priority, due_date, estimated_duration, tags)
      VALUES (?, ?, ?, 'Review Computer Networks & Socket Programming', 'Revisit OSI layers, TCP handshake, and CIDR subnetting for systems exam.', 'TODO', 'HIGH', ?, 60, ?)
    `).run(t2Id, userId, p2Id, new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), JSON.stringify(['exam', 'revision']));

    // An overdue task to demonstrate workflow engine!
    const tOverdueId = uuidv4();
    db.prepare(`
      INSERT INTO tasks (id, user_id, project_id, title, description, status, priority, due_date, estimated_duration, tags)
      VALUES (?, ?, ?, 'Submit Project Blueprint Draft', 'Draft project architecture and technical specifications.', 'TODO', 'HIGH', ?, 45, ?)
    `).run(tOverdueId, userId, p1Id, new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), JSON.stringify(['milestone', 'docs']));

    // A completed task
    const tCompletedId = uuidv4();
    db.prepare(`
      INSERT INTO tasks (id, user_id, project_id, milestone_id, title, description, status, priority, due_date, estimated_duration, completed_at, tags)
      VALUES (?, ?, ?, ?, 'Setup Repository & Environment Architecture', 'Initialize project directories and core configuration.', 'DONE', 'MEDIUM', ?, 30, ?, ?)
    `).run(
      tCompletedId,
      userId,
      p1Id,
      m1Id,
      new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      JSON.stringify(['setup', 'git'])
    );

    // 4. Initial Active Smart Reminder
    const remId = uuidv4();
    db.prepare(`
      INSERT INTO reminders (id, user_id, task_id, reminder_time, reminder_type, delivery_status)
      VALUES (?, ?, ?, ?, 'EXACT_TIME', 'PENDING')
    `).run(remId, userId, t2Id, new Date(now.getTime() + 18 * 60 * 60 * 1000).toISOString());

    // 5. Default Workflow Automation
    const wfId = uuidv4();
    db.prepare(`
      INSERT INTO workflows (id, user_id, name, description, trigger_type, condition_type, action_type, is_active)
      VALUES (?, ?, 'Overdue Task Automated Reminder', 'When a task becomes overdue and is not marked DONE, create an in-app reminder notification.', 'TASK_OVERDUE', 'STATUS_NOT_DONE', 'CREATE_NOTIFICATION', 1)
    `).run(wfId, userId);

    // 6. Notes
    db.prepare(`
      INSERT INTO notes (id, user_id, project_id, title, content, category, is_pinned, tags)
      VALUES (?, ?, ?, 'Hackathon Pitch & Architecture Decisions', '### Key Architecture Highlights:\n- **Official Model Context Protocol (MCP)**: Self-hosted server exposing 10 tools over Streamable HTTP (SSE) and Stdio transports.\n- **User Isolation**: Strictly enforced by verified token headers and SQLite foreign keys.\n- **AI Workflow**: Natural language -> Structured schema plan -> Human approval -> Database transaction.', 'Hackathon', 1, ?)
    `).run(uuidv4(), userId, p1Id, JSON.stringify(['pitch', 'architecture']));

    // 7. Focus Session
    db.prepare(`
      INSERT INTO focus_sessions (id, user_id, task_id, duration_minutes, notes)
      VALUES (?, ?, ?, 45, 'Deep focus session completing schema design')
    `).run(uuidv4(), userId, t1Id);

    // 8. Activity Events
    db.prepare(`
      INSERT INTO activity_events (id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, 'TASK', ?, 'COMPLETED', 'Setup Repository & Environment Architecture')
    `).run(uuidv4(), userId, tCompletedId);
  })();

  console.log('✓ Clean demo data successfully seeded.');
}
