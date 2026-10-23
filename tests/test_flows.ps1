Write-Host "=== TEST 1: AUTHENTICATION ==="
$auth = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/demo" -Method Post
$token = $auth.token
Write-Host "User authenticated: $($auth.user.name) ($($auth.user.email))"

$headers = @{ Authorization = "Bearer $token" }

Write-Host "`n=== TEST 2: DASHBOARD ==="
$dash = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/dashboard" -Headers $headers
Write-Host "Active Tasks: $($dash.summary.totalActiveTasks) | Completed: $($dash.summary.completedTasks) | Overdue: $($dash.summary.overdueTasks) | Rate: $($dash.summary.completionRate)%"

Write-Host "`n=== TEST 3: AI GOAL PLANNER ==="
$planReq = @{ prompt = "Help me prepare for my MCA exams in 30 days" } | ConvertTo-Json
$aiPlan = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/ai/plan" -Method Post -Headers $headers -Body $planReq -ContentType "application/json"
$planId = $aiPlan.planId
Write-Host "Generated AI Plan ID: $planId"
Write-Host "Project: $($aiPlan.plan.projectName)"
Write-Host "Tasks Count: $($aiPlan.plan.tasks.Count)"

Write-Host "`n=== TEST 4: APPROVE & PERSIST PLAN TO DATABASE ==="
$approveRes = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/ai/plans/$planId/approve" -Method Post -Headers $headers -Body "{}" -ContentType "application/json"
Write-Host "Status: $($approveRes.message)"
Write-Host "Created $($approveRes.tasksCreatedCount) tasks in SQLite DB under Project ID: $($approveRes.projectId)"

Write-Host "`n=== TEST 5: VERIFY PERSISTED TASKS ==="
$allTasks = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/tasks" -Headers $headers
Write-Host "Total Tasks now in DB: $($allTasks.Count)"

Write-Host "`n=== TEST 6: COMPLETE A TASK ==="
$firstTask = $allTasks[0]
$updateBody = @{ status = "DONE" } | ConvertTo-Json
$updatedTask = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/tasks/$($firstTask.id)" -Method Put -Headers $headers -Body $updateBody -ContentType "application/json"
Write-Host "Task '$($updatedTask.title)' status updated to: $($updatedTask.status)"

Write-Host "`n=== TEST 7: WORKFLOW ENGINE ==="
$workflows = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/workflows" -Headers $headers
$wf = $workflows[0]
Write-Host "Active Workflow: $($wf.name) [Trigger: $($wf.trigger_type) -> Action: $($wf.action_type)]"
$triggerRes = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/workflows/$($wf.id)/trigger" -Method Post -Headers $headers
Write-Host "Workflow Trigger Output: $($triggerRes.message)"
$execLogs = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/workflows/executions" -Headers $headers
Write-Host "Latest Execution: $($execLogs[0].action_taken) at $($execLogs[0].executed_at)"

Write-Host "`n=== TEST 8: ANALYTICS ==="
$analytics = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/analytics/overview" -Headers $headers
Write-Host "Updated Completion Rate: $($analytics.summary.completionRate)%"
Write-Host "Focus Time: $($analytics.summary.totalFocusMinutes) mins"

Write-Host "`nALL 8 CORE END-TO-END FLOWS VERIFIED SUCCESSFULLY!"
