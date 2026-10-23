import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/database.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';

export const aiRouter = Router();
aiRouter.use(authMiddleware);

interface PlanItem {
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedDurationMinutes: number;
  dayOffset: number; // days from now
  milestoneTitle?: string;
  subtasks: string[];
}

interface StructuredPlanOutput {
  projectName: string;
  projectDescription: string;
  summary: string;
  milestones: string[];
  tasks: PlanItem[];
}

// Generate structured plan from natural language goal
aiRouter.post('/plan', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { prompt } = req.body;

  if (!prompt || !prompt.trim()) {
    res.status(400).json({ error: 'Please enter a goal or task to plan.' });
    return;
  }

  try {
    const plan = generateIntelligentPlan(prompt.trim());
    const planId = uuidv4();

    db.prepare(`
      INSERT INTO ai_plans (id, user_id, goal_prompt, summary, status, plan_data)
      VALUES (?, ?, ?, ?, 'PROPOSED', ?)
    `).run(
      planId,
      userId,
      prompt.trim(),
      plan.summary,
      JSON.stringify(plan)
    );

    res.status(201).json({
      planId,
      status: 'PROPOSED',
      goal: prompt.trim(),
      plan,
    });
  } catch (err: any) {
    console.error('AI Planning error:', err);
    res.status(500).json({ error: 'Failed to generate plan.' });
  }
});

// Get plan by ID
aiRouter.get('/plans/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;

  try {
    const record = db.prepare('SELECT * FROM ai_plans WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!record) {
      res.status(404).json({ error: 'Plan not found.' });
      return;
    }

    res.json({
      ...record,
      plan_data: JSON.parse(record.plan_data),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve plan.' });
  }
});

// Approve plan: creates real project, milestones, and tasks in database!
aiRouter.post('/plans/:id/approve', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { modifiedPlan } = req.body; // Allows user to send edited tasks/milestones

  try {
    const record = db.prepare('SELECT * FROM ai_plans WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!record) {
      res.status(404).json({ error: 'Plan not found.' });
      return;
    }

    const plan: StructuredPlanOutput = modifiedPlan || JSON.parse(record.plan_data);
    const projectId = uuidv4();
    const now = new Date();

    const createdTasks: any[] = [];
    const milestoneMap = new Map<string, string>();

    db.transaction(() => {
      // 1. Create project
      db.prepare(`
        INSERT INTO projects (id, user_id, name, description, color, deadline)
        VALUES (?, ?, ?, ?, '#F97316', ?)
      `).run(
        projectId,
        userId,
        plan.projectName || 'AI Generated Project',
        plan.projectDescription || plan.summary,
        new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      );

      // 2. Create milestones
      if (Array.isArray(plan.milestones)) {
        const insertM = db.prepare(`
          INSERT INTO project_milestones (id, project_id, title, due_date, order_index)
          VALUES (?, ?, ?, ?, ?)
        `);
        plan.milestones.forEach((mTitle, idx) => {
          const mId = uuidv4();
          milestoneMap.set(mTitle, mId);
          const mDueDate = new Date(now.getTime() + (idx + 1) * 7 * 24 * 60 * 60 * 1000).toISOString();
          insertM.run(mId, projectId, mTitle, mDueDate, idx);
        });
      }

      // 3. Create tasks & subtasks
      const insertTask = db.prepare(`
        INSERT INTO tasks (id, user_id, project_id, milestone_id, title, description, status, priority, due_date, estimated_duration, tags)
        VALUES (?, ?, ?, ?, ?, ?, 'TODO', ?, ?, ?, ?)
      `);

      const insertSubtask = db.prepare(`
        INSERT INTO subtasks (id, task_id, title, is_completed, order_index)
        VALUES (?, ?, ?, 0, ?)
      `);

      for (const t of plan.tasks) {
        const taskId = uuidv4();
        const milestoneId = t.milestoneTitle ? milestoneMap.get(t.milestoneTitle) || null : null;
        const taskDueDate = new Date(now.getTime() + (t.dayOffset || 1) * 24 * 60 * 60 * 1000).toISOString();

        insertTask.run(
          taskId,
          userId,
          projectId,
          milestoneId,
          t.title,
          t.description || '',
          t.priority || 'MEDIUM',
          taskDueDate,
          t.estimatedDurationMinutes || 45,
          JSON.stringify(['ai-planned', plan.projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')])
        );

        if (Array.isArray(t.subtasks)) {
          t.subtasks.forEach((sub, sIdx) => {
            insertSubtask.run(uuidv4(), taskId, sub, sIdx);
          });
        }

        createdTasks.push({ id: taskId, title: t.title, due_date: taskDueDate });
      }

      // 4. Update plan status
      db.prepare(`
        UPDATE ai_plans SET status = 'APPROVED' WHERE id = ?
      `).run(id);

      // 5. Activity event
      db.prepare(`
        INSERT INTO activity_events (id, user_id, entity_type, entity_id, action, details)
        VALUES (?, ?, 'AI_PLAN', ?, 'APPROVED', ?)
      `).run(uuidv4(), userId, id, `Approved AI Plan: ${plan.projectName} with ${plan.tasks.length} tasks`);
    })();

    res.json({
      message: 'Plan approved and successfully persisted to workspace database!',
      projectId,
      tasksCreatedCount: createdTasks.length,
      tasks: createdTasks,
    });
  } catch (err: any) {
    console.error('Plan approval error:', err);
    res.status(500).json({ error: 'Failed to approve and persist plan.' });
  }
});

// Reject plan
aiRouter.post('/plans/:id/reject', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    db.prepare(`UPDATE ai_plans SET status = 'REJECTED' WHERE id = ? AND user_id = ?`).run(id, userId);
    res.json({ message: 'Plan rejected.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject plan.' });
  }
});

// AI Chat Assistant
aiRouter.post('/chat', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { message, conversationId } = req.body;

  if (!message || !message.trim()) {
    res.status(400).json({ error: 'Message cannot be empty.' });
    return;
  }

  try {
    let convId = conversationId;
    if (!convId) {
      convId = uuidv4();
      db.prepare(`
        INSERT INTO ai_conversations (id, user_id, title)
        VALUES (?, ?, ?)
      `).run(convId, userId, message.trim().slice(0, 40));
    }

    // Save user message
    db.prepare(`
      INSERT INTO ai_messages (id, conversation_id, sender, message)
      VALUES (?, ?, 'user', ?)
    `).run(uuidv4(), convId, message.trim());

    // Generate intelligent assistant response
    const replyText = generateAssistantReply(message.trim(), userId);

    const botMsgId = uuidv4();
    db.prepare(`
      INSERT INTO ai_messages (id, conversation_id, sender, message)
      VALUES (?, ?, 'assistant', ?)
    `).run(botMsgId, convId, replyText);

    res.json({
      conversationId: convId,
      message: {
        id: botMsgId,
        sender: 'assistant',
        text: replyText,
        created_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Failed to process AI chat message.' });
  }
});

// AI Notes Summarizer & action extractor
aiRouter.post('/summarize', (req: AuthenticatedRequest, res: Response) => {
  const { content, title } = req.body;
  if (!content) {
    res.status(400).json({ error: 'Content is required.' });
    return;
  }

  const sentences = content.split(/[.\n]+/).map((s: string) => s.trim()).filter((s: string) => s.length > 5);
  const keyTakeaways = sentences.slice(0, 3);
  const actionItems = sentences.filter((s: string) => /need|must|should|todo|prepare|review|create|fix|call|write|test/i.test(s)).slice(0, 4);

  res.json({
    title: title ? `Summary: ${title}` : 'Note Summary',
    summary: `This note covers ${sentences.length} core thoughts. Key emphasis revolves around actionable next steps and execution priorities.`,
    keyTakeaways: keyTakeaways.length > 0 ? keyTakeaways : ['Systematic plan established.', 'Priorities organized for optimal delivery.'],
    actionItems: actionItems.length > 0 ? actionItems : ['Review notes weekly', 'Follow up on pending questions'],
  });
});

// Heuristic intelligent breakdown generator
function generateIntelligentPlan(goal: string): StructuredPlanOutput {
  const lower = goal.toLowerCase();

  if (lower.includes('exam') || lower.includes('study') || lower.includes('mca') || lower.includes('test')) {
    return {
      projectName: 'Academic Preparation & Exam Mastery',
      projectDescription: `Structured 30-day curriculum and revision roadmap for: "${goal}"`,
      summary: 'A 3-phase revision plan balancing foundational concepts, problem-solving, and timed mock tests.',
      milestones: ['Foundational Concepts & Core Theory', 'Deep Problem Solving & Lab Work', 'Final Mock Exams & Rapid Revision'],
      tasks: [
        {
          title: 'Review Syllabus & Formulate Subject Weights',
          description: 'Identify highest-weight topics and gather past 5-year exam papers.',
          priority: 'HIGH',
          estimatedDurationMinutes: 60,
          dayOffset: 1,
          milestoneTitle: 'Foundational Concepts & Core Theory',
          subtasks: ['Download syllabus PDF', 'Mark chapters with 15%+ exam weight', 'Create daily study block slots'],
        },
        {
          title: 'Master Unit 1: Data Structures & Algorithms',
          description: 'Deep dive into Tree traversals, Graph algorithms, and Dynamic Programming.',
          priority: 'URGENT',
          estimatedDurationMinutes: 120,
          dayOffset: 3,
          milestoneTitle: 'Foundational Concepts & Core Theory',
          subtasks: ['Implement BFS and DFS', 'Solve 5 recurrence relations', 'Write clean summary flashcards'],
        },
        {
          title: 'Master Unit 2: Database Management Systems',
          description: 'Study Relational Calculus, B+ Trees indexing, and ACID concurrency control.',
          priority: 'HIGH',
          estimatedDurationMinutes: 90,
          dayOffset: 7,
          milestoneTitle: 'Foundational Concepts & Core Theory',
          subtasks: ['Practice 3NF and BCNF normalization', 'Write complex JOIN queries', 'Review transaction isolation levels'],
        },
        {
          title: 'Lab Exercises & Architecture Case Studies',
          description: 'Hands-on practice on software engineering diagrams and networking protocols.',
          priority: 'MEDIUM',
          estimatedDurationMinutes: 90,
          dayOffset: 14,
          milestoneTitle: 'Deep Problem Solving & Lab Work',
          subtasks: ['Draw UML sequence diagrams', 'Calculate subnet masks for IPv4/IPv6', 'Review lab viva questions'],
        },
        {
          title: 'Timed Mock Exam #1',
          description: 'Simulate full 3-hour exam conditions without notes.',
          priority: 'URGENT',
          estimatedDurationMinutes: 180,
          dayOffset: 21,
          milestoneTitle: 'Final Mock Exams & Rapid Revision',
          subtasks: ['Strict 3-hour timer', 'Self-grade against official answer rubric', 'Log recurring mistakes in notebook'],
        },
        {
          title: 'Final High-Yield Formula & Cheatsheet Polish',
          description: 'Memorize formulas, definitions, and acronyms for rapid recall.',
          priority: 'HIGH',
          estimatedDurationMinutes: 60,
          dayOffset: 28,
          milestoneTitle: 'Final Mock Exams & Rapid Revision',
          subtasks: ['Review red-flag topics', 'Rest well before exam day'],
        },
      ],
    };
  }

  // Default product/project breakdown
  return {
    projectName: `Project: ${goal.length > 35 ? goal.slice(0, 35) + '...' : goal}`,
    projectDescription: `AI-engineered execution plan to deliver: "${goal}"`,
    summary: 'Divided into scoping, core execution, testing, and launch milestones with clear subtasks.',
    milestones: ['Discovery & Architecture', 'Core Implementation', 'Quality Assurance & Launch'],
    tasks: [
      {
        title: 'Define Scope & Technical Specifications',
        description: 'Document requirements, user stories, and acceptance criteria.',
        priority: 'HIGH',
        estimatedDurationMinutes: 60,
        dayOffset: 1,
        milestoneTitle: 'Discovery & Architecture',
        subtasks: ['Draft scope document', 'Identify external dependencies and APIs', 'Establish completion timeline'],
      },
      {
        title: 'Design UI Wireframes & Workflow Layout',
        description: 'Create interactive views and define state management.',
        priority: 'MEDIUM',
        estimatedDurationMinutes: 90,
        dayOffset: 3,
        milestoneTitle: 'Discovery & Architecture',
        subtasks: ['Sketch responsive layout', 'Confirm color scheme and typography', 'Review user flow'],
      },
      {
        title: 'Build Core Features & Business Logic',
        description: 'Develop main functionality, database models, and API endpoints.',
        priority: 'URGENT',
        estimatedDurationMinutes: 180,
        dayOffset: 6,
        milestoneTitle: 'Core Implementation',
        subtasks: ['Implement database schema', 'Write REST API endpoints', 'Connect frontend state to backend'],
      },
      {
        title: 'Integration & End-to-End Testing',
        description: 'Validate data persistence, edge cases, and user permissions.',
        priority: 'HIGH',
        estimatedDurationMinutes: 90,
        dayOffset: 10,
        milestoneTitle: 'Quality Assurance & Launch',
        subtasks: ['Verify task lifecycle transitions', 'Test validation error handling', 'Perform cross-device test'],
      },
      {
        title: 'Final Deployment & Release Review',
        description: 'Publish production build, verify telemetry, and celebrate completion.',
        priority: 'MEDIUM',
        estimatedDurationMinutes: 60,
        dayOffset: 14,
        milestoneTitle: 'Quality Assurance & Launch',
        subtasks: ['Run production build checks', 'Deploy to hosting environment', 'Publish release announcement'],
      },
    ],
  };
}

function generateAssistantReply(message: string, userId: string): string {
  const lower = message.toLowerCase();

  // Query actual user context to provide real, contextual answers
  const taskCount = (db.prepare('SELECT COUNT(*) as c FROM tasks WHERE user_id = ?').get(userId) as any)?.c || 0;
  const overdueCount = (db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND due_date < datetime('now') AND status != 'DONE'").get(userId) as any)?.c || 0;
  const projectCount = (db.prepare('SELECT COUNT(*) as c FROM projects WHERE user_id = ?').get(userId) as any)?.c || 0;

  if (lower.includes('how many tasks') || lower.includes('my tasks') || lower.includes('status')) {
    return `You currently have ${taskCount} active task(s) and ${overdueCount} overdue item(s) across ${projectCount} project(s). Would you like me to help you schedule or prioritize your urgent tasks?`;
  }

  if (lower.includes('plan') || lower.includes('goal') || lower.includes('schedule') || lower.includes('exam')) {
    return `I can build a complete structured roadmap for you! Switch over to the **AI Goal Planner** tab or tell me your target timeline (e.g., "Prep for exams in 30 days" or "Ship my MVP in 2 weeks"), and I will generate milestones, daily tasks, and subtasks that you can approve directly into your database.`;
  }

  return `I'm TaskPilot AI, your productivity copilot. You have ${taskCount} tasks tracked in your workspace. You can ask me to break down complex goals, suggest schedules, summarize notes, or trigger workflow automations. What are you focusing on today?`;
}
