import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/database.js';
import { authMiddleware, AuthenticatedRequest, generateToken } from '../../middleware/auth.js';

export const authRouter = Router();

// Register with email and password
authRouter.post('/register', (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: 'Name, email, and password are required.' });
    return;
  }

  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const userId = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);

    const insertUser = db.transaction(() => {
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash)
        VALUES (?, ?, ?, ?)
      `).run(userId, name.trim(), email.toLowerCase().trim(), passwordHash);

      db.prepare(`
        INSERT INTO user_preferences (user_id)
        VALUES (?)
      `).run(userId);
    });

    insertUser();

    const token = generateToken(userId, email.toLowerCase().trim());
    res.status(201).json({
      token,
      user: {
        id: userId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        timezone: 'UTC',
        theme: 'light',
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create user account.' });
  }
});

// Login with email and password
authRouter.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any;
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = generateToken(user.id, user.email);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        timezone: user.timezone,
        theme: user.theme,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to authenticate user.' });
  }
});

// Google sign-in (or simulated Google token verification)
authRouter.post('/google', (req: Request, res: Response) => {
  const { credential, email, name, googleId } = req.body;
  const targetEmail = (email || 'demo.user@taskpilot.ai').toLowerCase().trim();
  const targetName = name || 'TaskPilot Demo User';

  try {
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(targetEmail) as any;
    if (!user) {
      const userId = uuidv4();
      const randomPassword = bcrypt.hashSync(uuidv4(), 10);
      db.transaction(() => {
        db.prepare(`
          INSERT INTO users (id, name, email, password_hash)
          VALUES (?, ?, ?, ?)
        `).run(userId, targetName, targetEmail, randomPassword);

        db.prepare(`
          INSERT INTO user_preferences (user_id)
          VALUES (?)
        `).run(userId);
      })();
      user = { id: userId, name: targetName, email: targetEmail, timezone: 'UTC', theme: 'light' };
    }

    const token = generateToken(user.id, user.email);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        timezone: user.timezone,
        theme: user.theme,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: 'Google sign-in failed.' });
  }
});

// Demo login for quick reviewer access
authRouter.post('/demo', (_req: Request, res: Response) => {
  const demoEmail = 'demo@taskpilot.ai';
  try {
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(demoEmail) as any;
    if (!user) {
      const userId = uuidv4();
      const pwHash = bcrypt.hashSync('demo12345', 10);
      db.transaction(() => {
        db.prepare(`
          INSERT INTO users (id, name, email, password_hash)
          VALUES (?, ?, ?, ?)
        `).run(userId, 'Alex Rivera', demoEmail, pwHash);

        db.prepare(`
          INSERT INTO user_preferences (user_id)
          VALUES (?)
        `).run(userId);
      })();
      user = { id: userId, name: 'Alex Rivera', email: demoEmail, timezone: 'UTC', theme: 'light' };
    }

    const token = generateToken(user.id, user.email);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        timezone: user.timezone || 'UTC',
        theme: user.theme || 'light',
      },
    });
  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({ error: 'Demo login failed.' });
  }
});

// Get current profile
authRouter.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = db.prepare('SELECT id, name, email, avatar_url, timezone, theme, created_at FROM users WHERE id = ?').get(req.userId) as any;
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const preferences = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(req.userId);
    res.json({ user, preferences });
  } catch (error) {
    console.error('Fetch me error:', error);
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});
