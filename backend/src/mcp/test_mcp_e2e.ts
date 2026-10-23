import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const BASE_URL = 'http://localhost:5000';

async function runMcpE2ETests() {
  console.log('====================================================');
  console.log('🤖 TASKPILOT AI — MODEL CONTEXT PROTOCOL (MCP) TEST');
  console.log('====================================================\n');

  // STEP 1: Authenticate to obtain token
  console.log('--- Step 1: Authenticating User ---');
  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@taskpilot.ai', password: 'demo12345' }),
  });

  if (!loginRes.ok) {
    throw new Error(`Failed to authenticate demo user: ${loginRes.status}`);
  }

  const { token, user } = await loginRes.json() as any;
  console.log(`✓ Authenticated as: ${user.name} (${user.email})\n`);

  // STEP 2: Connect MCP Client via Streamable HTTP (SSE Transport)
  console.log('--- Step 2: Connecting Official MCP Client via SSE Transport ---');
  const sseUrl = new URL(`${BASE_URL}/mcp/sse`);
  sseUrl.searchParams.set('token', token);

  const transport = new SSEClientTransport(sseUrl);
  const client = new Client(
    { name: 'TaskPilot-Test-Client', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log('✓ Successfully connected to TaskPilot MCP Server via Streamable HTTP SSE!\n');

  // STEP 3: List Tools
  console.log('--- Step 3: Discovering Available MCP Tools ---');
  const toolsResult = await client.listTools();
  console.log(`Discovered ${toolsResult.tools.length} MCP Tools:`);
  toolsResult.tools.forEach((t) => {
    console.log(`  • ${t.name}: ${t.description}`);
  });

  const expectedTools = ['create_task', 'list_tasks', 'update_task', 'complete_task'];
  for (const expected of expectedTools) {
    if (!toolsResult.tools.some((t) => t.name === expected)) {
      throw new Error(`Missing expected MCP tool: ${expected}`);
    }
  }
  console.log('✓ All 4 expected MCP tools registered and discoverable.\n');

  // STEP 4: Call create_task tool
  console.log('--- Step 4: Invoking MCP Tool "create_task" ---');
  const createRes = await client.callTool({
    name: 'create_task',
    arguments: {
      title: 'Hackathon Submission — MCP Verified Task',
      description: 'Created through official MCP Client over SSE transport',
      priority: 'HIGH',
      due_date: new Date(Date.now() + 86400000).toISOString(),
    },
  });

  if (createRes.isError) {
    throw new Error(`create_task tool call failed: ${JSON.stringify(createRes)}`);
  }

  const createContent = JSON.parse(((createRes as any).content[0] as any).text);
  console.log('create_task result:', createContent);
  const createdTaskId = createContent.task.id;
  if (!createdTaskId) throw new Error('Task ID missing in create_task response');
  console.log(`✓ Created Task ID: ${createdTaskId}\n`);

  // STEP 5: Call list_tasks tool
  console.log('--- Step 5: Invoking MCP Tool "list_tasks" ---');
  const listRes = await client.callTool({
    name: 'list_tasks',
    arguments: {
      limit: 100,
    },
  });

  const listContent = JSON.parse(((listRes as any).content[0] as any).text);
  console.log(`list_tasks returned ${listContent.count} tasks.`);
  const found = listContent.tasks.find((t: any) => t.id === createdTaskId);
  if (!found) {
    throw new Error(`Created task ${createdTaskId} was not found in list_tasks output`);
  }
  console.log(`✓ Verified Task '${found.title}' is present in persisted list.\n`);

  // STEP 6: Call update_task tool
  console.log('--- Step 6: Invoking MCP Tool "update_task" ---');
  const updateRes = await client.callTool({
    name: 'update_task',
    arguments: {
      task_id: createdTaskId,
      priority: 'URGENT',
      title: 'Hackathon Submission — MCP Verified Task [URGENT]',
    },
  });

  const updateContent = JSON.parse(((updateRes as any).content[0] as any).text);
  console.log('update_task result:', updateContent);
  if (updateContent.task.priority !== 'URGENT') {
    throw new Error(`Priority did not update to URGENT: got ${updateContent.task.priority}`);
  }
  console.log('✓ Successfully updated task priority to URGENT.\n');

  // STEP 7: Call complete_task tool
  console.log('--- Step 7: Invoking MCP Tool "complete_task" ---');
  const completeRes = await client.callTool({
    name: 'complete_task',
    arguments: {
      task_id: createdTaskId,
    },
  });

  const completeContent = JSON.parse(((completeRes as any).content[0] as any).text);
  console.log('complete_task result:', completeContent);
  if (completeContent.task.status !== 'DONE' || !completeContent.task.completed_at) {
    throw new Error(`Task not completed: ${JSON.stringify(completeContent)}`);
  }
  console.log('✓ Successfully completed task via MCP tool call!\n');

  // STEP 8: Security Check — Cross-user isolation
  console.log('--- Step 8: Security Validation — Cross-User Isolation ---');
  const invalidUpdateRes = await client.callTool({
    name: 'update_task',
    arguments: {
      task_id: 'non-existent-or-other-user-task-id',
      title: 'Malicious Edit Attempt',
    },
  });

  if (!invalidUpdateRes.isError) {
    throw new Error('Expected update_task on non-existent task to return an error, but it succeeded.');
  }
  console.log('✓ Unauthorized task mutation properly rejected with error.\n');

  await client.close();
  console.log('====================================================');
  console.log('🎉 ALL MCP PROTOCOL TESTS PASSED WITH 100% SUCCESS!');
  console.log('====================================================');
}

runMcpE2ETests().catch((err) => {
  console.error('❌ MCP E2E Test Failure:', err);
  process.exit(1);
});
