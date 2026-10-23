import { db, initDatabase } from './database.js';
import { seedDemoData } from './seed.js';

export function resetDatabase() {
  console.log('Purging test records and resetting TaskPilot AI database to pristine state...');

  // Disable foreign keys temporarily to truncate cleanly
  db.pragma('foreign_keys = OFF');

  const tables = [
    'workflow_executions',
    'workflows',
    'focus_sessions',
    'integrations',
    'activity_events',
    'notifications',
    'ai_plans',
    'ai_messages',
    'ai_conversations',
    'notes',
    'subtasks',
    'reminders',
    'tasks',
    'project_milestones',
    'projects',
    'user_preferences',
    'users',
  ];

  for (const table of tables) {
    try {
      db.prepare(`DELETE FROM ${table}`).run();
    } catch (err: any) {
      console.warn(`Could not clear table ${table}:`, err.message);
    }
  }

  // Vacuum SQLite database file
  try {
    db.prepare('VACUUM').run();
  } catch {}

  db.pragma('foreign_keys = ON');

  // Initialize schema & seed clean professional demo records
  initDatabase();
  seedDemoData(true);

  console.log('✓ TaskPilot AI database successfully reset to clean, professional state.');
}

if (process.argv[1]?.includes('reset')) {
  resetDatabase();
  process.exit(0);
}
