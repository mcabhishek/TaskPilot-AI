import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/database.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';

export const notesRouter = Router();
notesRouter.use(authMiddleware);

notesRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  const { category, search, projectId } = req.query;

  let query = `
    SELECT n.*, p.name as project_name
    FROM notes n
    LEFT JOIN projects p ON n.project_id = p.id
    WHERE n.user_id = ?
  `;
  const params: any[] = [userId];

  if (category) {
    query += ' AND n.category = ?';
    params.push(category);
  }
  if (projectId) {
    query += ' AND n.project_id = ?';
    params.push(projectId);
  }
  if (search) {
    query += ' AND (n.title LIKE ? OR n.content LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY n.is_pinned DESC, n.updated_at DESC';

  try {
    const notes = db.prepare(query).all(...params) as any[];
    const parsed = notes.map(n => {
      let tags = [];
      try { tags = JSON.parse(n.tags || '[]'); } catch { tags = []; }
      return { ...n, tags };
    });
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notes.' });
  }
});

notesRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;

  try {
    const note = db.prepare(`
      SELECT n.*, p.name as project_name
      FROM notes n
      LEFT JOIN projects p ON n.project_id = p.id
      WHERE n.id = ? AND n.user_id = ?
    `).get(id, userId) as any;

    if (!note) {
      res.status(404).json({ error: 'Note not found.' });
      return;
    }

    let tags = [];
    try { tags = JSON.parse(note.tags || '[]'); } catch { tags = []; }
    res.json({ ...note, tags });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch note.' });
  }
});

notesRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { title, content, category, tags, project_id, is_pinned } = req.body;

  if (!title || !title.trim()) {
    res.status(400).json({ error: 'Note title is required.' });
    return;
  }

  const noteId = uuidv4();
  const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);

  try {
    db.prepare(`
      INSERT INTO notes (id, user_id, project_id, title, content, category, tags, is_pinned)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      noteId,
      userId,
      project_id || null,
      title.trim(),
      content || '',
      category || 'General',
      tagsJson,
      is_pinned ? 1 : 0
    );

    db.prepare(`
      INSERT INTO activity_events (id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, 'NOTE', ?, 'CREATED', ?)
    `).run(uuidv4(), userId, noteId, `Created note: ${title.trim()}`);

    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId);
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create note.' });
  }
});

notesRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { title, content, category, tags, project_id, is_pinned } = req.body;

  try {
    const existing = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!existing) {
      res.status(404).json({ error: 'Note not found.' });
      return;
    }

    const tagsJson = tags !== undefined ? JSON.stringify(tags) : existing.tags;

    db.prepare(`
      UPDATE notes
      SET title = ?, content = ?, category = ?, tags = ?, project_id = ?, is_pinned = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      title !== undefined ? title.trim() : existing.title,
      content !== undefined ? content : existing.content,
      category !== undefined ? category : existing.category,
      tagsJson,
      project_id !== undefined ? project_id : existing.project_id,
      is_pinned !== undefined ? (is_pinned ? 1 : 0) : existing.is_pinned,
      id,
      userId
    );

    const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update note.' });
  }
});

notesRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const existing = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!existing) {
      res.status(404).json({ error: 'Note not found.' });
      return;
    }

    db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(id, userId);
    res.json({ message: 'Note deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete note.' });
  }
});
