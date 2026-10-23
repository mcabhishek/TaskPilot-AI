import { db } from '../../db/database.js';

export class BriefingService {
  /**
   * Generates a dynamic daily briefing personalized for the authenticated user
   * based on actual persisted database records.
   */
  static generateBriefing(userId: string) {
    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(userId) as any;
    const userName = user?.name ? user.name.split(' ')[0] : 'there';

    // Time of day greeting
    const currentHour = new Date().getHours();
    let timeGreeting = 'Good morning';
    if (currentHour >= 12 && currentHour < 17) {
      timeGreeting = 'Good afternoon';
    } else if (currentHour >= 17) {
      timeGreeting = 'Good evening';
    }

    // 1. Tasks due today
    const tasksDueToday = db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.user_id = ? AND date(t.due_date) = date('now') AND t.status != 'DONE'
      ORDER BY CASE t.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END, t.due_date ASC
    `).all(userId) as any[];

    // 2. Overdue tasks
    const overdueTasks = db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.user_id = ? AND t.due_date < datetime('now') AND t.status != 'DONE'
      ORDER BY t.due_date ASC
    `).all(userId) as any[];

    // 3. High & Urgent priority tasks
    const highPriorityTasks = db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.user_id = ? AND t.priority IN ('HIGH', 'URGENT') AND t.status != 'DONE'
      ORDER BY CASE t.priority WHEN 'URGENT' THEN 1 ELSE 2 END, t.due_date ASC
      LIMIT 6
    `).all(userId) as any[];

    // 3b. Upcoming deadlines in next 7 days
    const upcomingDeadlines = db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.user_id = ? AND date(t.due_date) > date('now') AND date(t.due_date) <= date('now', '+7 days') AND t.status != 'DONE'
      ORDER BY t.due_date ASC
      LIMIT 10
    `).all(userId) as any[];

    // 4. Scheduled reminders
    const scheduledReminders = db.prepare(`
      SELECT r.*, t.title as task_title, t.priority as task_priority, t.due_date as task_due_date
      FROM reminders r
      JOIN tasks t ON r.task_id = t.id
      WHERE r.user_id = ? AND r.delivery_status IN ('PENDING', 'SNOOZED')
      ORDER BY r.reminder_time ASC
      LIMIT 5
    `).all(userId) as any[];

    const totalAttentionNeeded = overdueTasks.length + tasksDueToday.length;

    // Handle Empty State
    if (totalAttentionNeeded === 0 && highPriorityTasks.length === 0 && upcomingDeadlines.length === 0) {
      return {
        greeting: `${timeGreeting}, ${userName}!`,
        headline: 'Clear Runway Ahead',
        has_tasks: false,
        summary: 'You have no overdue tasks or imminent deadlines on your schedule today.',
        spoken_briefing: `${timeGreeting}, ${userName}! You are completely caught up with zero overdue tasks and clear deadlines today. Great job keeping your workspace clean! Use this space to plan ahead or take a well-deserved breather.`,
        tasks_due_today: [],
        overdue_tasks: [],
        upcoming_deadlines: [],
        high_priority_tasks: [],
        scheduled_reminders: scheduledReminders,
        recommended_order: [],
        generated_at: new Date().toISOString(),
      };
    }

    // Build intelligent recommended order of execution
    const recommendedOrder: any[] = [];
    const seenTaskIds = new Set<string>();

    // Priority 1: Overdue tasks must be resolved first to avoid project bottlenecks
    overdueTasks.forEach((t, i) => {
      if (!seenTaskIds.has(t.id)) {
        seenTaskIds.add(t.id);
        recommendedOrder.push({
          task: t,
          rank: recommendedOrder.length + 1,
          reason: i === 0 ? 'Urgent: Overdue deadline requires immediate resolution' : 'Overdue deliverable',
        });
      }
    });

    // Priority 2: Tasks due today sorted by priority
    tasksDueToday.forEach((t) => {
      if (!seenTaskIds.has(t.id)) {
        seenTaskIds.add(t.id);
        recommendedOrder.push({
          task: t,
          rank: recommendedOrder.length + 1,
          reason: `Due today (${t.priority} priority)`,
        });
      }
    });

    // Priority 3: Remaining high priority tasks
    highPriorityTasks.forEach((t) => {
      if (!seenTaskIds.has(t.id)) {
        seenTaskIds.add(t.id);
        recommendedOrder.push({
          task: t,
          rank: recommendedOrder.length + 1,
          reason: 'High strategic priority item',
        });
      }
    });

    // Generate natural spoken briefing script
    const spokenSentences: string[] = [];
    spokenSentences.push(`${timeGreeting}, ${userName}! Here is your daily productivity briefing.`);

    if (overdueTasks.length > 0) {
      const topOverdue = overdueTasks[0];
      spokenSentences.push(`Attention needed: you have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}, starting with "${topOverdue.title}".`);
    }

    if (tasksDueToday.length > 0) {
      spokenSentences.push(`You have ${tasksDueToday.length} task${tasksDueToday.length > 1 ? 's' : ''} scheduled for completion today.`);
    }

    if (recommendedOrder.length > 0) {
      const first = recommendedOrder[0].task;
      spokenSentences.push(`I recommend starting with "${first.title}".`);
      if (recommendedOrder.length > 1) {
        const second = recommendedOrder[1].task;
        spokenSentences.push(`After that, move on to "${second.title}".`);
      }
    }

    if (scheduledReminders.length > 0) {
      spokenSentences.push(`You also have ${scheduledReminders.length} reminder${scheduledReminders.length > 1 ? 's' : ''} set to trigger.`);
    }

    spokenSentences.push('Have a focused and productive session!');

    return {
      greeting: `${timeGreeting}, ${userName}!`,
      headline: overdueTasks.length > 0
        ? `${overdueTasks.length} Overdue Task${overdueTasks.length > 1 ? 's' : ''} & ${tasksDueToday.length} Due Today`
        : `${tasksDueToday.length} Task${tasksDueToday.length > 1 ? 's' : ''} Due Today`,
      has_tasks: true,
      summary: `You have ${totalAttentionNeeded} priority item${totalAttentionNeeded > 1 ? 's' : ''} requiring focus.`,
      spoken_briefing: spokenSentences.join(' '),
      tasks_due_today: tasksDueToday,
      overdue_tasks: overdueTasks,
      upcoming_deadlines: upcomingDeadlines,
      high_priority_tasks: highPriorityTasks,
      scheduled_reminders: scheduledReminders,
      recommended_order: recommendedOrder.slice(0, 5),
      generated_at: new Date().toISOString(),
    };
  }
}
