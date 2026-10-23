# TaskPilot AI — Plan Smarter. Do More.

> **AI-Powered Productivity Workspace with Official Model Context Protocol (MCP) Server**  
> *Built for the Amazon Developer AppDev 2026 Alexa+ Hackathon*

---

## 🚀 Overview

**TaskPilot AI** is a production-grade, privacy-first productivity assistant engineered for the Amazon AppDev 2026 Alexa+ Hackathon. It combines relational database persistence (SQLite WAL mode), reactive workflow automation, and an official **Model Context Protocol (MCP)** server adhering to the official specification using `@modelcontextprotocol/sdk` (v1.32.1).

### Hackathon Compliance & The Alexa+ Architecture

According to the official Amazon AppDev 2026 Alexa+ Hackathon rules and FAQ:
- **Direct physical Alexa+ developer tool integration** is restricted to selected Amazon invite-only partner organizations.
- For all hackathon participants, the official approved evaluation path is:
  1. A **real, self-hosted Model Context Protocol (MCP) server** operating over **Streamable HTTP (Server-Sent Events)** suitable for public HTTPS deployment.
  2. A **polished web simulator** that behaves like a voice assistant, communicating strictly via an official **MCP Client** using `tools/list` and `tools/call`.
  3. **OAuth 2.1 authorization code flow with PKCE (S256)**, resource indicators, and RFC 8414 authorization server metadata for external agent interoperability.

TaskPilot AI implements this architecture cleanly and transparently:
- **Zero fake data or mocked endpoints**: Every MCP tool directly reads or mutates persistent SQLite database tables.
- **Strict tenant isolation**: User data is strictly bound to cryptographic JWT claims, preventing cross-user data leakage.
- **Natural multi-turn voice & text interaction**: Handles voice input (Web Speech API) with conversational confirmation dialogs (e.g. before creating reminders or deleting tasks).

---

## 🎨 Visual Design System

Built with a warm, elegant design system matching the established TaskPilot AI palette:
- **Main Background**: `#FAF8F5`
- **Primary Surfaces**: `#FFFFFF`
- **Secondary Surfaces**: `#F7F1EB`
- **Active Navigation (Soft Peach)**: `#FBE8D9`
- **Primary Orange (Brand Accent)**: `#E87532`
- **Hover Orange**: `#C95D24`
- **Primary Text**: `#25231F`
- **Secondary Text**: `#77716A`
- **Borders**: `#EAE3DC`
- **Semantic Feedback**:
  - Success: `#27845B`
  - Warning: `#D99032`
  - Error: `#D94F45`

---

## 🤖 Official Model Context Protocol (MCP) Server

TaskPilot AI implements an official MCP server using `@modelcontextprotocol/sdk` conforming to the 2025-11-25 / 2024-11-05 specifications.

### Supported Transports & Endpoints

1. **Streamable HTTP (Server-Sent Events)**:
   - **SSE Stream**: `GET /mcp/sse?token=<jwt>` (or `Authorization: Bearer <token>`)
   - **JSON-RPC Messages**: `POST /mcp/messages?sessionId={id}`
   - **Service Metadata**: `GET /mcp/info`
2. **Standard I/O (Stdio Transport)**:
   - Executable: `backend/src/mcp/stdio.ts`
   - Run: `npx tsx src/mcp/stdio.ts` (with `TASKPILOT_USER_EMAIL` or `TASKPILOT_API_TOKEN`)
3. **Official MCP Client Service (Backend-for-Frontend)**:
   - `GET /api/v1/mcp-client/status`: Inspects active Streamable HTTP connection and tool discovery.
   - `POST /api/v1/mcp-client/call-tool`: Direct JSON-RPC `tools/call` execution over SSE.
   - `POST /api/v1/mcp-client/assistant`: Conversational assistant routing requests through the official MCP client.
4. **OAuth 2.1 RFC 8414 Authorization Server (Alexa+ Interoperability)**:
   - Metadata: `GET /.well-known/oauth-authorization-server`
   - Authorization: `GET /oauth/authorize` (supports `code_challenge`, `code_challenge_method=S256`, `resource`)
   - Token Exchange: `POST /oauth/token` (verifies `code_verifier` with SHA-256 base64url)

---

## 🛠️ The 10 Official TaskPilot MCP Tools

Every tool performs real operations against the persistent SQLite relational database:

| # | Tool Name | Description | Parameters |
| :- | :--- | :--- | :--- |
| 1 | `get_daily_briefing` | Return today's tasks, upcoming deadlines (next 7 days), overdue tasks, and scheduled reminders. | *(none)* |
| 2 | `list_tasks` | Retrieve user tasks with filtering by date (`today`, `tomorrow`, ISO), status (`TODO`, `IN_PROGRESS`, `DONE`), priority, project, search, and overdue flag. | `date`, `status`, `priority`, `project_id`, `search`, `overdue`, `limit` |
| 3 | `create_task` | Create a task with title, description, priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), and optional deadline. | `title` (required), `description`, `priority`, `due_date`, `project_id` |
| 4 | `create_reminder` | Create a persistent reminder for a specified date and time linked to an existing or auto-created task. | `task_id` (optional), `task_title` (optional), `reminder_time` (required), `reminder_type` |
| 5 | `complete_task` | Mark a task as completed with an immutable completion timestamp. | `task_id` (optional), `task_title` (optional) |
| 6 | `reschedule_task` | Change a task's due date or time with timestamp validation and workflow evaluation. | `task_id` (optional), `task_title` (optional), `due_date` (required ISO 8601) |
| 7 | `update_task` | Update task details, status, priority, or due date with ownership validation. | `task_id` (required), `title`, `description`, `status`, `priority`, `due_date`, `project_id` |
| 8 | `snooze_reminder` | Postpone a reminder by a specified duration in minutes (default 15). | `reminder_id` (required), `minutes` (1-1440) |
| 9 | `list_reminders` | Retrieve upcoming, completed, and overdue reminders with their linked task details. | `status` (`UPCOMING`, `OVERDUE`, `COMPLETED`, `PENDING`, `SNOOZED`, `DISMISSED`, `ALL`), `task_id`, `limit` |
| 10 | `delete_task` | Delete a task only after the requested operation has been clearly identified and validated with confirmation. | `task_id` (optional), `task_title` (optional), `confirm` (required boolean) |
| * | `dismiss_reminder` | Dismiss an active reminder and clear associated notifications. | `reminder_id` (required) |

---

## 🎙️ Dedicated Alexa-Style Assistant & MCP Simulator

The frontend features a dedicated Assistant interface accessible at `/ai`:
- **Assistant Identity & Microphone Button**: Animated listening orb visualizer with Web Speech API speech-to-text and SpeechSynthesis natural narration.
- **Conversation Area**: Chronological dialogue with user speech transcripts, assistant vocal responses, and interactive confirmation buttons (e.g., confirming a reminder or deletion).
- **Visible Connection Status Badge**: Real-time display indicating `MCP Server: Connected (Streamable HTTP SSE)`, protocol version `2025-11-25`, and `10 Tools Discovered`.
- **Tool Execution History & Inspector**: Every assistant interaction records the exact MCP tool called, input arguments, execution latency in milliseconds, and returned JSON-RPC payload.
- **Live Workstation Cards**: Real-time task cards and scheduled reminder cards that dynamically refresh after tool execution.

### Example Multi-Turn Conversation
> **User**: *"Remind me to submit my assignment tomorrow at 9 AM"*  
> **Assistant**: *"I'll create a reminder for 'Submit assignment' scheduled for tomorrow at 9:00 AM. Would you like me to save it?"*  
> **User**: *"Yes, save it"*  
> **Assistant calls `create_reminder`** via the official MCP Client over Streamable HTTP SSE, receives the persisted record, and confirms: *"I've saved your reminder successfully."*

---

## 🧪 Comprehensive Automated Test Suite

Run the full automated test suite with a single command from the root directory:

```bash
npm test
```

### Individual Test Commands & Current Results

| Command | Suite Description | Status |
| :--- | :--- | :--- |
| `npm run test:unit` | Task bounds, rescheduling, date filtering, subtasks, tenant isolation, and MCP server instantiation | **PASS (9/9 tests)** |
| `npm run test:reminders` | Smart reminders lifecycle, validation, auto task linking, scheduler idempotency, daily briefing, and assistant | **PASS (10/10 tests)** |
| `npm run test:mcp` | Connects official MCP Client via Streamable HTTP SSE, discovers all 10 tools, executes every tool, verifies cross-user isolation, multi-turn assistant confirmation, and OAuth 2.1 PKCE S256 | **PASS (16/16 steps, 100%)** |
| `npm run test:flows` | End-to-end API verification of auth, AI planner, workflows, and analytics | **PASS (8/8 flows)** |
| `npm run build` | Compiles backend TypeScript (`tsc`) and builds frontend production bundle (`vite build`) | **PASS (0 errors)** |
| `npm run lint` | Runs frontend fast linter (`oxlint`) | **PASS (0 errors)** |

---

## ⚡ Quick Start & Deployment Guide

### Prerequisites
- Node.js (v18+ or v24+ recommended)
- npm

### 1. Setup Environment Variables
Copy `.env.example` to `.env` in the `backend/` directory:
```bash
PORT=5000
NODE_ENV=development
JWT_SECRET=taskpilot-super-secret-jwt-key-2026
```

### 2. Start Servers
From the repository root:
```bash
# Start backend on http://localhost:5000
npm run start:backend

# In a separate terminal, start frontend on http://localhost:5173
npm run start:frontend
```

### 3. Demo Account
Navigate to `http://localhost:5173`:
- Click **"Explore Demo Workspace"** or sign in with:
  - **Email**: `demo@taskpilot.ai`
  - **Password**: `demo12345`

### 4. Public HTTPS Deployment for Hackathon Evaluators
To expose the MCP server to external clients (e.g. Claude Desktop, Cursor, or external Alexa skills):
```bash
# Using Cloudflare Tunnel or ngrok:
ngrok http 5000
# Your public MCP Streamable HTTP endpoint:
# https://<your-subdomain>.ngrok-free.app/mcp/sse?token=<jwt>
```

---

## 🎥 Recording & Demonstration Checklist

To record the 3-minute hackathon demo video:
1. **Show MCP Server Connection**: Navigate to `/ai`, point out the green badge: `MCP Server: Connected (Streamable HTTP SSE) • 10 Tools`.
2. **Execute Daily Briefing via Voice**: Tap the microphone or click prompt *"What do I need to finish today?"*. Point out the `get_daily_briefing` MCP tool execution chip and audio response.
3. **Multi-Turn Smart Reminder**: Say *"Remind me to submit my assignment tomorrow at 9 AM"*. Note the confirmation prompt: *"Would you like me to save it?"*. Click or say *"Yes, save it"*. Show the reminder appear in the live cards.
4. **Reschedule Task**: Say *"Reschedule urgent task to Friday"*. Watch `reschedule_task` execute over MCP and update the database.
5. **Inspect MCP Tool Traces**: Click the tool execution chip to open the JSON-RPC trace showing transport, latency (ms), and exact returned payload.
6. **Show Automated Test Suite**: Run `npm test` in the terminal to show all unit, reminder, MCP E2E (16 steps), and workflow tests passing with 100% success.
