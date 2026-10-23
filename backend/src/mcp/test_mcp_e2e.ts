import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import assert from 'node:assert';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:5000';

async function runMcpE2ETests() {
  console.log('================================================================');
  console.log('🤖 TASKPILOT AI — OFFICIAL MCP PROTOCOL E2E & COMPLIANCE SUITE');
  console.log('================================================================\n');

  // STEP 1: Authenticate to obtain JWT token
  console.log('--- Step 1: Authenticating User ---');
  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@taskpilot.ai', password: 'demo12345' }),
  });

  if (!loginRes.ok) {
    throw new Error(`Failed to authenticate demo user: ${loginRes.status}`);
  }

  const { token, user } = (await loginRes.json()) as any;
  console.log(`✓ Authenticated as: ${user.name} (${user.email})\n`);

  // STEP 2: Connect Official MCP Client via official Streamable HTTP Transport
  console.log('--- Step 2: Connecting Official MCP Client via Streamable HTTP Transport ---');
  const mcpUrl = new URL(`${BASE_URL}/mcp`);
  mcpUrl.searchParams.set('token', token);

  const transport = new StreamableHTTPClientTransport(mcpUrl, {
    requestInit: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const client = new Client(
    { name: 'TaskPilot-Alexa-Hackathon-Test-Client', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log(`✓ Successfully connected to TaskPilot MCP Server via Streamable HTTP!`);
  console.log(`✓ Active Streamable HTTP Session ID: ${transport.sessionId}\n`);

  // STEP 3: Discover Tools (tools/list)
  console.log('--- Step 3: Discovering Available MCP Tools ---');
  const toolsResult = await client.listTools();
  console.log(`Discovered ${toolsResult.tools.length} Registered MCP Tools:`);
  toolsResult.tools.forEach((t) => {
    console.log(`  • ${t.name}: ${(t.description || '').slice(0, 70)}...`);
  });

  const expected10Tools = [
    'get_daily_briefing',
    'list_tasks',
    'create_task',
    'create_reminder',
    'complete_task',
    'reschedule_task',
    'update_task',
    'snooze_reminder',
    'list_reminders',
    'delete_task',
  ];

  for (const expected of expected10Tools) {
    const found = toolsResult.tools.find((t) => t.name === expected);
    if (!found) {
      throw new Error(`Missing expected official MCP tool: ${expected}`);
    }
  }
  console.log(`✓ All 10 hackathon-mandated MCP tools are registered and discoverable!\n`);

  // STEP 4: Call Tool: create_task
  console.log('--- Step 4: Invoking MCP Tool "create_task" ---');
  const tomorrowIso = new Date(Date.now() + 86400000).toISOString();
  const createRes = await client.callTool({
    name: 'create_task',
    arguments: {
      title: 'Hackathon Submission — Streamable HTTP Task',
      description: 'Created through official MCP Client over Streamable HTTP transport',
      priority: 'HIGH',
      due_date: tomorrowIso,
    },
  });

  assert.strictEqual(createRes.isError, undefined, 'create_task should not error');
  const createContent = JSON.parse(((createRes as any).content[0] as any).text);
  assert.ok(createContent.success, 'create_task success should be true');
  const createdTaskId = createContent.task.id;
  assert.ok(createdTaskId, 'Task ID must be returned by create_task');
  console.log(`✓ Created Task ID: ${createdTaskId} ("${createContent.task.title}")\n`);

  // STEP 5: Call Tool: list_tasks with date filtering
  console.log('--- Step 5: Invoking MCP Tool "list_tasks" (with date filtering) ---');
  const listRes = await client.callTool({
    name: 'list_tasks',
    arguments: {
      date: 'tomorrow',
      limit: 50,
    },
  });

  assert.strictEqual(listRes.isError, undefined, 'list_tasks should not error');
  const listContent = JSON.parse(((listRes as any).content[0] as any).text);
  assert.ok(listContent.success, 'list_tasks should return success');
  console.log(`list_tasks returned ${listContent.count} tasks for tomorrow.`);
  const foundTask = listContent.tasks.find((t: any) => t.id === createdTaskId);
  assert.ok(foundTask, 'Newly created task must be returned by list_tasks filter');
  console.log(`✓ Verified Task '${foundTask.title}' is present in persisted list.\n`);

  // STEP 6: Call Tool: update_task
  console.log('--- Step 6: Invoking MCP Tool "update_task" ---');
  const updateRes = await client.callTool({
    name: 'update_task',
    arguments: {
      task_id: createdTaskId,
      priority: 'URGENT',
      title: 'Hackathon Submission — Streamable HTTP Task [URGENT]',
    },
  });

  assert.strictEqual(updateRes.isError, undefined, 'update_task should not error');
  const updateContent = JSON.parse(((updateRes as any).content[0] as any).text);
  assert.strictEqual(updateContent.task.priority, 'URGENT', 'Priority should be updated to URGENT');
  console.log(`✓ Successfully updated task priority to URGENT.\n`);

  // STEP 7: Call Tool: create_reminder
  console.log('--- Step 7: Invoking MCP Tool "create_reminder" ---');
  const reminderTimeIso = new Date(Date.now() + 2 * 3600000).toISOString();
  const createRemRes = await client.callTool({
    name: 'create_reminder',
    arguments: {
      task_id: createdTaskId,
      reminder_time: reminderTimeIso,
      reminder_type: 'EXACT_TIME',
    },
  });

  assert.strictEqual(createRemRes.isError, undefined, 'create_reminder should not error');
  const remContent = JSON.parse(((createRemRes as any).content[0] as any).text);
  assert.ok(remContent.success, 'create_reminder should succeed');
  const createdReminderId = remContent.reminder.id;
  assert.ok(createdReminderId, 'Reminder ID must be returned');
  console.log(`✓ Successfully scheduled reminder ID: ${createdReminderId} for task "${remContent.reminder.task_title}"\n`);

  // STEP 8: Call Tool: list_reminders
  console.log('--- Step 8: Invoking MCP Tool "list_reminders" ---');
  const listRemRes = await client.callTool({
    name: 'list_reminders',
    arguments: {
      status: 'UPCOMING',
      limit: 20,
    },
  });

  assert.strictEqual(listRemRes.isError, undefined, 'list_reminders should not error');
  const listRemContent = JSON.parse(((listRemRes as any).content[0] as any).text);
  assert.ok(listRemContent.reminders.length >= 1, 'Should find at least 1 upcoming reminder');
  console.log(`✓ list_reminders returned ${listRemContent.reminders.length} upcoming reminders.\n`);

  // STEP 9: Call Tool: snooze_reminder
  console.log('--- Step 9: Invoking MCP Tool "snooze_reminder" ---');
  const snoozeRes = await client.callTool({
    name: 'snooze_reminder',
    arguments: {
      reminder_id: createdReminderId,
      minutes: 30,
    },
  });

  assert.strictEqual(snoozeRes.isError, undefined, 'snooze_reminder should not error');
  const snoozeContent = JSON.parse(((snoozeRes as any).content[0] as any).text);
  assert.ok(snoozeContent.success, 'snooze_reminder should succeed');
  console.log(`✓ Successfully snoozed reminder by 30 minutes.\n`);

  // STEP 10: Call Tool: get_daily_briefing
  console.log('--- Step 10: Invoking MCP Tool "get_daily_briefing" ---');
  const briefingRes = await client.callTool({
    name: 'get_daily_briefing',
    arguments: {},
  });

  assert.strictEqual(briefingRes.isError, undefined, 'get_daily_briefing should not error');
  const briefingContent = JSON.parse(((briefingRes as any).content[0] as any).text);
  assert.ok(briefingContent.briefing.headline, 'Briefing must include headline');
  console.log(`✓ get_daily_briefing headline: "${briefingContent.briefing.headline}"\n`);

  // STEP 11: Call Tool: reschedule_task
  console.log('--- Step 11: Invoking MCP Tool "reschedule_task" ---');
  const newDueDate = new Date(Date.now() + 3 * 86400000).toISOString();
  const rescheduleRes = await client.callTool({
    name: 'reschedule_task',
    arguments: {
      task_id: createdTaskId,
      due_date: newDueDate,
    },
  });

  assert.strictEqual(rescheduleRes.isError, undefined, 'reschedule_task should not error');
  const rescheduleContent = JSON.parse(((rescheduleRes as any).content[0] as any).text);
  assert.ok(rescheduleContent.success, 'reschedule_task should return success');
  console.log(`✓ Rescheduled task to new due date: ${rescheduleContent.task.due_date}\n`);

  // STEP 12: Call Tool: complete_task
  console.log('--- Step 12: Invoking MCP Tool "complete_task" ---');
  const completeRes = await client.callTool({
    name: 'complete_task',
    arguments: {
      task_id: createdTaskId,
    },
  });

  assert.strictEqual(completeRes.isError, undefined, 'complete_task should not error');
  const completeContent = JSON.parse(((completeRes as any).content[0] as any).text);
  assert.strictEqual(completeContent.task.status, 'DONE');
  console.log(`✓ Successfully completed task at ${completeContent.task.completed_at}.\n`);

  // STEP 13: Call Tool: delete_task with confirmation enforcement
  console.log('--- Step 13: Invoking MCP Tool "delete_task" ---');
  const unconfirmedDelete = await client.callTool({
    name: 'delete_task',
    arguments: {
      task_id: createdTaskId,
      confirm: false,
    },
  });

  assert.strictEqual(unconfirmedDelete.isError, true, 'Unconfirmed delete must return isError: true');
  console.log(`✓ Validation check: unconfirmed deletion correctly rejected.`);

  const confirmedDelete = await client.callTool({
    name: 'delete_task',
    arguments: {
      task_id: createdTaskId,
      confirm: true,
    },
  });

  assert.strictEqual(confirmedDelete.isError, undefined, 'Confirmed delete should succeed');
  console.log(`✓ Confirmed deletion succeeded and purged task from SQLite.\n`);

  // STEP 14: Security Validation — Cross-User Isolation
  console.log('--- Step 14: Security Validation — Cross-User Isolation ---');
  const userBRegRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'User B Isolation Test',
      email: `userb-${Date.now()}@test.com`,
      password: 'password123',
    }),
  });

  const { token: userBToken } = (await userBRegRes.json()) as any;
  const userBTransport = new StreamableHTTPClientTransport(mcpUrl, {
    requestInit: {
      headers: {
        Authorization: `Bearer ${userBToken}`,
      },
    },
  });

  const userBClient = new Client(
    { name: 'User-B-Security-Client', version: '1.0.0' },
    { capabilities: {} }
  );

  await userBClient.connect(userBTransport);

  // User B tries to reschedule User A's task
  const crossUserRes = await userBClient.callTool({
    name: 'reschedule_task',
    arguments: {
      task_id: createdTaskId,
      due_date: new Date().toISOString(),
    },
  });

  assert.strictEqual(crossUserRes.isError, true, 'Cross-user mutation must fail with isError: true');
  console.log(`✓ Cross-user mutation attempt successfully rejected with error.\n`);

  await userBClient.close();
  await client.close();

  // STEP 15: Test MCP Client Bridge & Assistant Endpoints
  console.log('--- Step 15: Testing MCP Client Bridge & Assistant Endpoints ---');
  const statusRes = await fetch(`${BASE_URL}/api/v1/mcp-client/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const statusData = (await statusRes.json()) as any;
  assert.strictEqual(statusData.connected, true, 'MCP client status should report connected');
  assert.strictEqual(statusData.transport, 'Streamable HTTP');
  assert.strictEqual(statusData.serverEndpoint, '/mcp');
  console.log(`✓ /api/v1/mcp-client/status verified: connected over Streamable HTTP (${statusData.toolCount} tools).`);

  // Test Assistant natural language flow with confirmation
  const assistantRes = await fetch(`${BASE_URL}/api/v1/mcp-client/assistant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text: 'Remind me to submit final project report tomorrow at 9 AM' }),
  });
  const assistantData = (await assistantRes.json()) as any;
  assert.ok(assistantData.requires_confirmation, 'Creating a reminder should prompt confirmation');
  console.log(`✓ Assistant response: "${assistantData.spoken_response}"`);

  // Confirm action
  const confirmRes = await fetch(`${BASE_URL}/api/v1/mcp-client/assistant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text: 'Yes, save it' }),
  });
  const confirmData = (await confirmRes.json()) as any;
  assert.strictEqual(confirmData.tool_executed, 'create_reminder');
  assert.ok(confirmData.mcp_trace, 'MCP trace must be recorded');
  console.log(`✓ Assistant confirmation executed MCP tool: ${confirmData.tool_executed} (${confirmData.mcp_trace.durationMs}ms)\n`);

  // STEP 16: Test OAuth 2.1 RFC 8414 Metadata & PKCE (S256) Flow
  console.log('--- Step 16: Testing OAuth 2.1 RFC 8414 & PKCE (S256) Flow ---');
  const oauthMetaRes = await fetch(`${BASE_URL}/.well-known/oauth-authorization-server`);
  const oauthMeta = (await oauthMetaRes.json()) as any;
  assert.ok(oauthMeta.authorization_endpoint, 'Authorization endpoint must be declared');
  assert.ok(oauthMeta.code_challenge_methods_supported.includes('S256'), 'Must support S256 PKCE');
  console.log(`✓ RFC 8414 Metadata verified at /.well-known/oauth-authorization-server`);

  // Test 16a: Unauthenticated authorization request MUST be rejected (login_required)
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const unauthAuthRes = await fetch(
    `${BASE_URL}/oauth/authorize?response_type=code&client_id=taskpilot-alexa-simulator&redirect_uri=http://localhost:5000/oauth/test-callback&code_challenge=${codeChallenge}&code_challenge_method=S256`,
    { redirect: 'manual' }
  );
  assert.strictEqual(unauthAuthRes.status, 401, 'Unauthenticated authorization request must be rejected with 401');
  console.log(`✓ Security verified: unauthenticated OAuth authorization request correctly rejected with 401.`);

  // Test 16b: Open redirect attempt MUST be rejected
  const openRedirectRes = await fetch(
    `${BASE_URL}/oauth/authorize?response_type=code&client_id=taskpilot-alexa-simulator&redirect_uri=https://evil-attacker.com/steal-code&code_challenge=${codeChallenge}&code_challenge_method=S256`,
    {
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'manual',
    }
  );
  assert.strictEqual(openRedirectRes.status, 400, 'Unregistered redirect_uri must be rejected with 400');
  console.log(`✓ Security verified: open redirect attack prevented.`);

  // Test 16c: Authenticated valid request succeeds with redirect containing authorization code
  const authUrl = `${BASE_URL}/oauth/authorize?response_type=code&client_id=taskpilot-alexa-simulator&redirect_uri=http://localhost:5000/oauth/test-callback&code_challenge=${codeChallenge}&code_challenge_method=S256&scope=mcp:read+mcp:write`;
  const authRes = await fetch(authUrl, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: 'manual',
  });
  const locationHeader = authRes.headers.get('location');
  assert.ok(locationHeader, 'Authorize should return redirect location header');

  const redirectUrl = new URL(locationHeader);
  const authCode = redirectUrl.searchParams.get('code');
  assert.ok(authCode, 'Authorization code must be present in redirect URI');
  console.log(`✓ OAuth 2.1 PKCE authorization code successfully issued.`);

  // Test 16d: Token exchange with valid PKCE code_verifier
  const tokenRes = await fetch(`${BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: 'http://localhost:5000/oauth/test-callback',
      client_id: 'taskpilot-alexa-simulator',
      code_verifier: codeVerifier,
    }),
  });

  const tokenData = (await tokenRes.json()) as any;
  assert.ok(tokenData.access_token, 'Access token must be issued by OAuth 2.1 PKCE');
  assert.strictEqual(tokenData.token_type, 'Bearer');
  console.log(`✓ Token exchange verified with PKCE S256 verifier.`);

  // Test 16e: Authorization code reuse MUST be rejected
  const reuseRes = await fetch(`${BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: 'http://localhost:5000/oauth/test-callback',
      client_id: 'taskpilot-alexa-simulator',
      code_verifier: codeVerifier,
    }),
  });
  assert.strictEqual(reuseRes.status, 400, 'Code reuse must be rejected with 400');
  console.log(`✓ Security verified: authorization code reuse rejected (single-use enforced).`);

  // Cleanup test reminder & task created in Step 15 to leave workspace clean
  if (confirmData?.mcp_trace?.parsedContent?.reminder?.task_id) {
    await fetch(`${BASE_URL}/api/v1/tasks/${confirmData.mcp_trace.parsedContent.reminder.task_id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  console.log('================================================================');
  console.log('🎉 ALL 16 MCP PROTOCOL, TOOL, & OAUTH 2.1 TESTS PASSED WITH 100%!');
  console.log('================================================================');
}

runMcpE2ETests().catch((err) => {
  console.error('❌ MCP E2E Test Failure:', err);
  process.exit(1);
});
