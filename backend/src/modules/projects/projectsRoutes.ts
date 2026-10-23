import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/database.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';

export const projectsRouter = Router();
projectsRouter.use(authMiddleware);

// Get all projects with calculated task progress
projectsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  try {
    const projects = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as total_tasks,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'DONE') as completed_tasks,
        (SELECT COUNT(*) FROM project_milestones WHERE project_id = p.id) as total_milestones
      FROM projects p
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `).all(userId) as any[];

    const enriched = projects.map(p => ({
      ...p,
      progress: p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0,
    }));

    res.json(enriched);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects.' });
  }
});

// Get single project with tasks and milestones
projectsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;

  try {
    const project = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as total_tasks,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'DONE') as completed_tasks
      FROM projects p
      WHERE p.id = ? AND p.user_id = ?
    `).get(id, userId) as any;

    if (!project) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }

    const tasks = db.prepare(`
      SELECT t.*,
        (SELECT COUNT(*) FROM subtasks WHERE task_id = t.id) as subtask_count,
        (SELECT COUNT(*) FROM subtasks WHERE task_id = t.id AND is_completed = 1) as completed_subtask_count
      FROM tasks t
      WHERE t.project_id = ?
      ORDER BY t.created_at DESC
    `).all(id);

    const milestones = db.prepare(`
      SELECT * FROM project_milestones WHERE project_id = ? ORDER BY order_index ASC, due_date ASC
    `).all(id);

    res.json({
      ...project,
      progress: project.total_tasks > 0 ? Math.round((project.completed_tasks / project.total_tasks) * 100) : 0,
      tasks,
      milestones,
    });
  } catch (err) {
    console.error('Error fetching project details:', err);
    res.status(500).json({ error: 'Failed to fetch project.' });
  }
});

// Create project
projectsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { name, description, color, deadline, milestones } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Project name is required.' });
    return;
  }

  const projectId = uuidv4();
  try {
    db.transaction(() => {
      db.prepare(`
        INSERT INTO projects (id, user_id, name, description, color, deadline)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(projectId, userId, name.trim(), description || '', color || '#F97316', deadline || null);

      if (Array.isArray(milestones)) {
        const insertM = db.prepare(`
          INSERT INTO project_milestones (id, project_id, title, due_date, order_index)
          VALUES (?, ?, ?, ?, ?)
        `);
        milestones.forEach((m: any, idx: number) => {
          insertM.run(uuidv4(), projectId, typeof m === 'string' ? m : m.title, m.due_date || null, idx);
        });
      }

      db.prepare(`
        INSERT INTO activity_events (id, user_id, entity_type, entity_id, action, details)
        VALUES (?, ?, 'PROJECT', ?, 'CREATED', ?)
      `).run(uuidv4(), userId, projectId, `Created project: ${name.trim()}`);
    })();

    const created = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ error: 'Failed to create project.' });
  }
});

// Update project
projectsRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { name, description, color, status, deadline } = req.body;

  try {
    const existing = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!existing) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }

    db.prepare(`
      UPDATE projects
      SET name = ?, description = ?, color = ?, status = ?, deadline = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      name !== undefined ? name.trim() : existing.name,
      description !== undefined ? description : existing.description,
      color !== undefined ? color : existing.color,
      status !== undefined ? status : existing.status,
      deadline !== undefined ? deadline : existing.deadline,
      id,
      userId
    );

    const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    console.error('Error updating project:', err);
    res.status(500).json({ error: 'Failed to update project.' });
  }
});

// Delete project
projectsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const existing = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!existing) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }

    db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(id, userId);

    db.prepare(`
      INSERT INTO activity_events (id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, 'PROJECT', ?, 'DELETED', ?)
    `).run(uuidv4(), userId, id, `Deleted project: ${existing.name}`);

    res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});

// Milestones
projectsRouter.post('/:id/milestones', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { title, due_date } = req.body;

  if (!title) {
    res.status(400).json({ error: 'Milestone title is required.' });
    return;
  }

  try {
    const p = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(id, userId);
    if (!p) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }

    const milestoneId = uuidv4();
    db.prepare(`
      INSERT INTO project_milestones (id, project_id, title, due_date)
      VALUES (?, ?, ?, ?)
    `).run(milestoneId, id, title.trim(), due_date || null);

    const m = db.prepare('SELECT * FROM project_milestones WHERE id = ?').get(milestoneId);
    res.status(201).json(m);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add milestone.' });
  }
});

projectsRouter.put('/:id/milestones/:milestoneId', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { id, milestoneId } = req.params;
  const { title, status, due_date } = req.body;

  try {
    const p = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(id, userId);
    if (!p) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }

    const m = db.prepare('SELECT * FROM project_milestones WHERE id = ? AND project_id = ?').get(milestoneId, id) as any;
    if (!m) {
      res.status(404).json({ error: 'Milestone not found.' });
      return;
    }

    db.prepare(`
      UPDATE project_milestones
      SET title = ?, status = ?, due_date = ?
      WHERE id = ? AND project_id = ?
    `).run(
      title !== undefined ? title.trim() : m.title,
      status !== undefined ? status : m.status,
      due_date !== undefined ? due_date : m.due_date,
      milestoneId,
      id
    );

    const updated = db.prepare('SELECT * FROM project_milestones WHERE id = ?').get(milestoneId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update milestone.' });
  }
});
