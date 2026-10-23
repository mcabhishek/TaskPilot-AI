# TaskPilot AI — Plan Smarter. Do More.

> **AI-Powered Productivity Workspace with Model Context Protocol (MCP) Integration**  
> *Built for the Amazon Developer Hackathon*

---

## 🚀 Overview

**TaskPilot AI** transforms high-level goals into structured, actionable execution. Instead of juggling fragmented to-do apps, static calendar views, disconnected notes, and generic chatbots, TaskPilot AI provides a unified workspace that bridges conversational intelligence with real database persistence, visual workflow automation, and an official **Model Context Protocol (MCP)** server.

### The Problem
Traditional task managers require painstaking manual organization and lack context. Chatbots provide abstract suggestions without creating actual deliverables or tracking progress. When deadlines slip, users have no automated safeguards. Furthermore, AI agents outside the application cannot interact with user productivity data securely.

### The Solution
TaskPilot AI combines:
1. **Official Model Context Protocol (MCP) Server**: Exposes standard MCP tools (`create_task`, `list_tasks`, `update_task`, `complete_task`) over both Streamable HTTP (SSE) and Stdio transports, allowing Claude, Cursor, and external agents to orchestrate productivity workflows safely.
2. **AI Goal Planning with Human Approval**: Converts requests like *"Help me prepare for my MCA exams in 30 days"* into structured milestones, tasks, estimated durations, and subtasks—with human review before committing to the database.
3. **End-to-End Task & Project Management**: Priorities (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), status transitions (`TODO`, `IN_PROGRESS`, `DONE`), subtasks, and calculated project velocity.
4. **Calendar Scheduling**: Interactive month, week, and day scheduling with quick reschedule dialogs.
5. **Visual Workflow Automation**: Real event-driven engine (`TASK_OVERDUE`, `TASK_CREATED`, `STATUS_CHANGED`) with duplicate run protection and execution audit logs.
6. **Verified Productivity Telemetry**: Analytics calculated from active database records, plus a built-in Pomodoro deep work timer.

---

## 🎨 Visual Design System

Built with a warm, elegant, light theme inspired by premium modern productivity products:
- **Main Background**: `#FAF8F5`
- **Primary Surfaces**: `#FFFFFF`
- **Secondary Surfaces**: `#F7F1EB`
- **Soft Peach (Active Navigation)**: `#FBE8D9`
- **Primary Orange**: `#E87532`
- **Hover Orange**: `#C95D24`
- **Primary Text**: `#25231F`
- **Secondary Text**: `#77716A`
- **Borders**: `#EAE3DC`
- **Semantic Feedback**:
  - Success: `#27845B`
  - Warning: `#D99032`
  - Error: `#D94F45`

---

## 🤖 Model Context Protocol (MCP) Server

TaskPilot AI implements an official **Model Context Protocol (MCP)** server adhering to the official specification using `@modelcontextprotocol/sdk` (v1.32.1).

### Supported Transports
1. **Streamable HTTP (Server-Sent Events)**:
   - SSE Connection: `GET /mcp/sse?token=<jwt>` (or `Authorization: Bearer <token>`)
   - Message Delivery: `POST /mcp/messages?sessionId={id}`
   - Service Info: `GET /mcp/info`
2. **Standard I/O (Stdio Transport)**:
   - Executable: `backend/src/mcp/stdio.ts`
   - Invocation: `npx tsx src/mcp/stdio.ts` (with `TASKPILOT_USER_EMAIL` or `TASKPILOT_API_TOKEN`)

### Registered MCP Tools

| Tool Name | Description | Parameters |
| :--- | :--- | :--- |
| `create_task` | Creates a new task and evaluates triggered workflows | `title` (required), `description`, `priority` (`LOW`\|`MEDIUM`\|`HIGH`\|`URGENT`), `due_date` (ISO 8601), `project_id` |
| `list_tasks` | Retrieves user tasks with safe pagination and filters | `status` (`TODO`\|`IN_PROGRESS`\|`DONE`), `priority`, `project_id`, `limit` (1-200) |
| `update_task` | Modifies fields on an existing task with ownership validation | `task_id` (required), `title`, `description`, `status`, `priority`, `due_date`, `project_id` |
| `complete_task` | Marks a task as `DONE` and records completion timestamp | `task_id` (required) |

### Strict Tenant Security
Every MCP connection enforces cryptographic JWT verification. Each session is bound to the authenticated user ID, strictly preventing cross-user data exposure or unauthorized mutations.

### Connecting Claude Desktop or Cursor to TaskPilot MCP
Add the following to your `claude_desktop_config.json` or MCP client configuration:
```json
{
  "mcpServers": {
    "taskpilot": {
      "command": "npx",
      "args": ["-y", "tsx", "c:/Users/asus/OneDrive/Desktop/ams/backend/src/mcp/stdio.ts"],
      "env": {
        "TASKPILOT_USER_EMAIL": "demo@taskpilot.ai"
      }
    }
  }
}
```

---

## 🏗️ Architecture & Technology Stack

```
ams/
├── frontend/                     # React 19 + Vite + Lucide Icons + Canvas Confetti
│   ├── src/
│   │   ├── components/common/    # Reusable design system components (Button, Modal, Toast, Card, etc.)
│   │   ├── context/              # AuthContext with session restoration
│   │   ├── layouts/              # AppLayout (Persistent 240px Sidebar, Topbar, Search)
│   │   ├── pages/                # 11 Redesigned Modules (Landing, Dashboard, Tasks, AI, etc.)
│   │   ├── services/             # Centralized API service layer
│   │   └── index.css             # Complete design system tokens & typography
├── backend/                      # Node.js + Express + TypeScript Modular Monolith
│   ├── src/
│   │   ├── db/                   # SQLite relational storage (WAL mode, foreign keys, transactions)
│   │   ├── mcp/                  # Official Model Context Protocol (MCP) server & SSE router
│   │   ├── middleware/           # JWT Authentication & User Isolation
│   │   ├── modules/              # Auth, Tasks, Projects, AI, Calendar, Notes, Workflows, Analytics, Settings
│   │   ├── tests/                # Core unit & security test suite
│   │   └── index.ts              # Server bootstrap & background overdue scanner
├── tests/                        # Integration & automated flow test scripts
└── package.json                  # Root runner scripts
```

---

## ⚡ Quick Start Guide

### Prerequisites
- Node.js (v18+ or v24+ recommended)
- npm

### 1. Install & Run Development Servers

**Option A — From Project Root:**
```bash
# Start backend on http://localhost:5000
npm run start:backend

# In a separate terminal, start frontend on http://localhost:5173
npm run start:frontend
```

**Option B — Independent Folders:**
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

### 2. Demo Credentials
Open `http://localhost:5173` in your browser. Click **"Explore Demo Workspace"** or sign in with:
- **Email**: `demo@taskpilot.ai`
- **Password**: `demo12345`

---

## 🧪 Automated Testing Suite

All tests can be executed with single commands from the repository root:

| Command | Suite Description | Status |
| :--- | :--- | :--- |
| `npm run test:unit` | Validates input bounds, tenant isolation, and status transitions | **PASS (7/7 tests)** |
| `npm run test:mcp` | Connects official MCP Client via SSE, calls all 4 tools, verifies SQLite persistence | **PASS (100% verified)** |
| `npm run test:flows` | End-to-end API verification of auth, AI planner, workflows, and analytics | **PASS (8/8 flows)** |
| `npm test` | Runs all 3 test suites sequentially | **PASS** |
| `npm run build` | Compiles backend TypeScript (`tsc`) and builds frontend production bundle (`vite build`) | **PASS (0 errors)** |
| `npm run lint` | Runs frontend fast linter (`oxlint`) | **PASS (0 errors)** |

---

## 🎯 Hackathon Demonstration Steps

1. **Sign In**: Navigate to `http://localhost:5173` and click **"Explore Demo Workspace"**.
2. **Dashboard**: View real database KPI cards, overdue tasks, focus timer, and audit events.
3. **AI Assistant & Goal Planner**:
   - Go to `/ai`.
   - Click prompt chip: *"Break down MCA Final Semester Project into 5 actionable milestones"*.
   - Click **Generate Roadmap**.
   - Review proposed tasks and click **"Approve & Commit to Workspace"**.
4. **Task Verification**:
   - Go to `/tasks`. Observe the freshly committed tasks.
   - Click the checkmark on any task to trigger the celebration confetti animation.
5. **Model Context Protocol (MCP)**:
   - Run `npm run test:mcp` to watch an external MCP client connect to `/mcp/sse`, discover tools, create a task, list tasks, update priority to URGENT, and complete the task live.
6. **Automation Engine**:
   - Go to `/automation`.
   - Trigger manual test on *Overdue Task Automated Reminder*.
   - Inspect the **Execution History & Audit Trail** log showing instant execution.
