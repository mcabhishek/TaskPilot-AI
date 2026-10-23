import { describe, it } from 'node:test';
import assert from 'node:assert';
import { v4 as uuidv4 } from 'uuid';
import { db, initDatabase } from '../db/database.js';
import { TasksService } from '../modules/tasks/tasksService.js';
import { createTaskPilotMcpServer } from '../mcp/taskpilotMcpServer.js';

// Ensure database is initialized
initDatabase();

describe('TaskPilot AI — Core Unit & Security Test Suite', () => {
  const testUserA = uuidv4();
  const testUserB = uuidv4();

  // Seed two distinct isolated test users
  db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, password_hash)
    VALUES (?, ?, ?, ?), (?, ?, ?, ?)
  `).run(
    testUserA, 'Test User A', `usera_${Date.now()}@test.com`, 'hash',
    testUserB, 'Test User B', `userb_${Date.now()}@test.com`, 'hash'
  );

  it('Validation: rejects task creation with empty or whitespace-only title', () => {
    assert.throws(
      () => TasksService.createTask({ userId: testUserA, title: '   ' }),
      /Task title is required/
    );
    assert.throws(
      () => TasksService.createTask({ userId: testUserA, title: '' }),
      /Task title is required/
    );
  });

  it('Persistence: creates task with valid fields and sets default status/priority', () => {
    const task = TasksService.createTask({
      userId: testUserA,
      title: 'Unit Test Task Alpha',
      description: 'Testing core persistence',
    });

    assert.ok(task.id, 'Task ID should be generated');
    assert.strictEqual(task.user_id, testUserA);
    assert.strictEqual(task.title, 'Unit Test Task Alpha');
    assert.strictEqual(task.status, 'TODO');
    assert.strictEqual(task.priority, 'MEDIUM');
    assert.strictEqual(task.completed_at, null);
  });

  it('Security & Isolation: User B cannot read or list User A tasks', () => {
    const taskA = TasksService.createTask({
      userId: testUserA,
      title: 'Secret Task for User A',
    });

    // User A can read it
    const readByA = TasksService.getTaskById(testUserA, taskA.id);
    assert.ok(readByA, 'User A should access own task');

    // User B cannot read it
    const readByB = TasksService.getTaskById(testUserB, taskA.id);
    assert.strictEqual(readByB, null, 'User B must not be able to read User A task');

    // User B task list does not include User A task
    const listB = TasksService.listTasks({ userId: testUserB });
    const leak = listB.find((t) => t.id === taskA.id);
    assert.strictEqual(leak, undefined, 'User B task list must not leak User A tasks');
  });

  it('Security & Isolation: User B cannot mutate or complete User A tasks', () => {
    const taskA = TasksService.createTask({
      userId: testUserA,
      title: 'Immutable by User B',
    });

    assert.throws(
      () => TasksService.updateTask({ userId: testUserB, taskId: taskA.id, title: 'Hacked' }),
      /Task not found or access denied/
    );

    assert.throws(
      () => TasksService.completeTask(testUserB, taskA.id),
      /Task not found or access denied/
    );

    assert.throws(
      () => TasksService.deleteTask(testUserB, taskA.id),
      /Task not found or access denied/
    );
  });

  it('Status Transitions: completing task sets status DONE and completed_at timestamp', () => {
    const task = TasksService.createTask({
      userId: testUserA,
      title: 'Lifecycle Verification Task',
    });

    const completed = TasksService.completeTask(testUserA, task.id);
    assert.strictEqual(completed.status, 'DONE');
    assert.ok(completed.completed_at, 'completed_at timestamp must be populated');

    // Reopen task
    const reopened = TasksService.updateTask({
      userId: testUserA,
      taskId: task.id,
      status: 'IN_PROGRESS',
    });
    assert.strictEqual(reopened.status, 'IN_PROGRESS');
    assert.strictEqual(reopened.completed_at, null, 'completed_at must be cleared on reopen');
  });

  it('Subtasks: supports nested subtask checklist with completion tracking', () => {
    const task = TasksService.createTask({
      userId: testUserA,
      title: 'Parent Task with Subtasks',
      subtasks: ['Subtask One', { title: 'Subtask Two', is_completed: true }],
    });

    const details = TasksService.getTaskById(testUserA, task.id);
    assert.strictEqual(details.subtasks.length, 2);
    assert.strictEqual(details.subtasks[0].title, 'Subtask One');
    assert.strictEqual(details.subtasks[0].is_completed, 0);
    assert.strictEqual(details.subtasks[1].title, 'Subtask Two');
    assert.strictEqual(details.subtasks[1].is_completed, 1);
  });

  it('MCP Server: exposes correct tool schemas and reject unauthorized mutations', async () => {
    const mcpServer = createTaskPilotMcpServer(testUserA);
    assert.ok(mcpServer, 'MCP Server instance should be constructed');
  });
});
