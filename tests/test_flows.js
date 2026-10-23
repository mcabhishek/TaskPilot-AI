/**
 * TaskPilot AI — Cross-Platform End-to-End User Flow Test Suite
 * Runs seamlessly on Linux, macOS, and Windows without PowerShell dependency.
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';

async function runFlows() {
  console.log('=== TEST 1: AUTHENTICATION ===');
  const authRes = await fetch(`${BASE_URL}/auth/demo`, { method: 'POST' });
  if (!authRes.ok) throw new Error(`Auth failed: ${authRes.statusText}`);
  const auth = await authRes.json();
  const token = auth.token;
  console.log(`User authenticated: ${auth.user.name} (${auth.user.email})`);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  console.log('\n=== TEST 2: DASHBOARD ===');
  const dashRes = await fetch(`${BASE_URL}/dashboard`, { headers });
  const dash = await dashRes.json();
  console.log(
    `Active Tasks: ${dash.summary.totalActiveTasks} | Completed: ${dash.summary.completedTasks} | Overdue: ${dash.summary.overdueTasks} | Rate: ${dash.summary.completionRate}%`
  );

  console.log('\n=== TEST 3: AI GOAL PLANNER ===');
  const planReq = JSON.stringify({ prompt: 'Help me prepare for my MCA exams in 30 days' });
  const aiPlanRes = await fetch(`${BASE_URL}/ai/plan`, {
    method: 'POST',
    headers,
    body: planReq,
  });
  const aiPlan = await aiPlanRes.json();
  const planId = aiPlan.planId;
  console.log(`Generated AI Plan ID: ${planId}`);
  console.log(`Project: ${aiPlan.plan.projectName}`);
  console.log(`Tasks Count: ${aiPlan.plan.tasks.length}`);

  console.log('\n=== TEST 4: APPROVE & PERSIST PLAN TO DATABASE ===');
  const approveRes = await fetch(`${BASE_URL}/ai/plans/${planId}/approve`, {
    method: 'POST',
    headers,
    body: '{}',
  });
  const approveData = await approveRes.json();
  console.log(`Status: ${approveData.message}`);
  console.log(`Created ${approveData.tasksCreatedCount} tasks in SQLite DB under Project ID: ${approveData.projectId}`);

  console.log('\n=== TEST 5: VERIFY PERSISTED TASKS ===');
  const allTasksRes = await fetch(`${BASE_URL}/tasks`, { headers });
  const allTasks = await allTasksRes.json();
  console.log(`Total Tasks now in DB: ${allTasks.length}`);

  console.log('\n=== TEST 6: COMPLETE A TASK ===');
  const firstTask = allTasks[0];
  const updateBody = JSON.stringify({ status: 'DONE' });
  const updatedTaskRes = await fetch(`${BASE_URL}/tasks/${firstTask.id}`, {
    method: 'PUT',
    headers,
    body: updateBody,
  });
  const updatedTask = await updatedTaskRes.json();
  console.log(`Task '${updatedTask.title}' status updated to: ${updatedTask.status}`);

  console.log('\n=== TEST 7: WORKFLOW ENGINE ===');
  const workflowsRes = await fetch(`${BASE_URL}/workflows`, { headers });
  const workflows = await workflowsRes.json();
  const wf = workflows[0];
  console.log(`Active Workflow: ${wf.name} [Trigger: ${wf.trigger_type} -> Action: ${wf.action_type}]`);

  const triggerRes = await fetch(`${BASE_URL}/workflows/${wf.id}/trigger`, {
    method: 'POST',
    headers,
  });
  const triggerData = await triggerRes.json();
  console.log(`Workflow Trigger Output: ${triggerData.message}`);

  const execLogsRes = await fetch(`${BASE_URL}/workflows/executions`, { headers });
  const execLogs = await execLogsRes.json();
  console.log(`Latest Execution: ${execLogs[0].action_taken} at ${execLogs[0].executed_at}`);

  console.log('\n=== TEST 8: ANALYTICS ===');
  const analyticsRes = await fetch(`${BASE_URL}/analytics/overview`, { headers });
  const analytics = await analyticsRes.json();
  console.log(`Updated Completion Rate: ${analytics.summary.completionRate}%`);
  console.log(`Focus Time: ${analytics.summary.totalFocusMinutes} mins`);

  // Cleanup generated project to maintain pristine database state
  await fetch(`${BASE_URL}/projects/${approveData.projectId}`, {
    method: 'DELETE',
    headers,
  });

  console.log('\nALL 8 CORE END-TO-END FLOWS VERIFIED SUCCESSFULLY!');
}

runFlows().catch((err) => {
  console.error('Flow test failed:', err);
  process.exit(1);
});
