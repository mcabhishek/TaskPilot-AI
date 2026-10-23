# TaskPilot AI — Plan Smarter. Do More.

> **AI-Powered Productivity & Workflow Management Workspace**  
> *Built for the Amazon Developer Hackathon*

---

## 🚀 Overview

**TaskPilot AI** transforms high-level goals into structured, actionable execution. Instead of juggling fragmented to-do apps, static calendar views, disconnected notes, and generic chatbots, TaskPilot AI provides a unified workspace that bridges conversational intelligence with real database persistence and visual workflow automation.

### The Problem
Traditional task managers require painstaking manual organization and lack context. Chatbots provide abstract suggestions without creating actual deliverables or tracking progress. When deadlines slip, users have no automated safeguards.

### The Solution
TaskPilot AI combines:
1. **AI Goal Planning with Human Approval**: Converts requests like *"Help me prepare for my MCA exams in 30 days"* into structured milestones, tasks, estimated durations, and subtasks—with human review before committing to the database.
2. **End-to-End Task & Project Management**: Priorities, status transitions (`TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`), subtasks, and calculated project velocity.
3. **Calendar Scheduling**: Interactive month, week, and day scheduling with quick drag/click rescheduling.
4. **Visual Workflow Automation**: Real event-driven engine (`TASK_OVERDUE`, `TASK_CREATED`, `STATUS_CHANGED`) with guards, duplicate protection, and execution audit history.
5. **Verified Productivity Telemetry**: Analytics calculated from active database records, plus a built-in Pomodoro deep work timer.

---

## 🎨 Visual Design System

Built with a warm, bright, minimalist theme inspired by the TaskPilot AI design blueprint:
- **Main Background**: `#FFFDF9`
- **Card Background**: `#FFFFFF`
- **Primary Accent**: `#F97316` (Vibrant Orange)
- **Deep Accent**: `#EA580C`
- **Pale Orange**: `#FFF0E5`
- **Warm Cream**: `#FFF8F0`
- **Main Text**: `#1F2937`
- **Borders**: `#F1E7DD`
- **Success / Warning / Danger**: `#10B981` / `#F59E0B` / `#EF4444`

---

## 🏗️ Architecture & Technology Stack

```
ams/
├── frontend/                     # React 19 + Vite + Lucide Icons + Canvas Confetti
│   ├── src/
│   │   ├── context/              # AuthContext with session restoration
│   │   ├── layouts/              # AppLayout (Sidebar, Topbar, Notifications)
│   │   ├── pages/                # 11 Modules (Landing, Dashboard, Tasks, AI, Calendar, etc.)
│   │   ├── services/             # Centralized API service layer
│   │   └── index.css             # Complete design system & tokens
├── backend/                      # Node.js + Express + TypeScript Modular Monolith
│   ├── src/
│   │   ├── db/                   # SQLite relational storage (WAL mode, foreign keys, seed)
│   │   ├── middleware/           # JWT Authentication & User Isolation
│   │   ├── modules/              # Auth, Tasks, Projects, AI, Calendar, Notes, Workflows, etc.
│   │   └── index.ts              # Server bootstrap & background overdue scanner
└── README.md
```

- **Frontend**: React + Vite, React Router v7, Lucide Icons, Canvas Confetti.
- **Backend**: Express + TypeScript modular architecture.
- **Database**: Relational SQLite / PostgreSQL-compatible schema with foreign key constraints, cascading deletes, transactions, and index optimizations.
- **Security & User Isolation**: JWT Bearer authentication; user identity derived strictly from verified tokens.
- **AI Planning Layer**: Structured JSON schema validation with milestone/task breakdown and approval lifecycle.
- **Automation Engine**: Periodic background scanner and event-driven trigger pipeline with duplicate run prevention.

---

## 📱 Implemented Application Modules

| Module | Features & Capabilities |
| :--- | :--- |
| **Landing Page** | Product value proposition, feature preview cards, sign in/up form, and 1-click reviewer demo access. |
| **Dashboard** | Real metrics (Active tasks, completed, overdue, today's work), upcoming deadlines, overdue alerts, and audit timeline. |
| **Tasks** | Complete CRUD, subtask checklists, status transitions, priority badges, project associations, search & filters. |
| **AI Assistant** | Natural-language goal planner, reviewable structured plan output, human approval commit, copilot chat, and note summarizer. |
| **Calendar** | Monthly grid, color-coded task and milestone items, today selector, and quick reschedule modal. |
| **Projects** | Multi-phase initiatives, milestones checklist, calculated completion progress percentages, and task links. |
| **Notes** | Markdown content, categorization, pinned notes, search, and 1-click AI summarization. |
| **Automation** | Visual pipeline builder (Triggers, Conditions, Actions), active workflow toggles, manual test runner, and execution audit logs. |
| **Integrations** | Directory (Google Calendar, Slack, GitHub, Webhook) with live status, connect modal, and latency test handshake. |
| **Analytics** | Verified completion rates, priority distribution breakdown, status metrics, and interactive Pomodoro focus session timer. |
| **Settings** | User profile, work hours (start/end), daily goal target, notification preferences, and password management. |

---

## ⚡ Quick Start Guide

### Prerequisites
- Node.js (v18+ or v24+ recommended)
- npm

### 1. Start the Backend Server
```bash
cd backend
npm install
npm run dev
```
*Backend runs on `http://localhost:5000` and automatically initializes the database and seeds sample hackathon data.*

### 2. Start the Frontend Application
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173` with configured API proxying to port 5000.*

### 3. One-Click Demo Credentials
On the landing page (`http://localhost:5173`), click **"Sign in with Demo Account"** or use:
- **Email**: `demo@taskpilot.ai`
- **Password**: `demo12345`

---

## 🎯 Hackathon Demonstration Script

1. **Sign In**: Open `http://localhost:5173` and click **"Instant Reviewer Demo"**.
2. **Dashboard**: Observe real database metrics: active tasks, completed count, overdue alert, and recent activity.
3. **AI Goal Planner**:
   - Navigate to **AI Assistant** (`/ai`).
   - Click the prompt: *"Help me prepare for my MCA exams in 30 days"*.
   - Click **Generate Plan**. Review the proposed milestones and subtasks.
   - Click **Approve & Create Tasks**. Observe that records are persisted directly to the database.
4. **Task Verification**:
   - Navigate to **Tasks** (`/tasks`). View the newly created exam preparation tasks.
   - Click the checkbox to complete a task (celebration confetti triggers).
5. **Automation Verification**:
   - Navigate to **Automation** (`/automation`).
   - Click **"Test Run"** on the *Overdue Task Automated Reminder* workflow.
   - Check the **Execution History & Audit Trail** table to see the instant logged execution and bell notification.
6. **Analytics & Focus Session**:
   - Navigate to **Analytics** (`/analytics`).
   - Start the Deep Focus Pomodoro session or view the verified priority distribution chart.
