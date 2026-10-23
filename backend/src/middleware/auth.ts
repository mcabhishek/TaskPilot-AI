import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'taskpilot-super-secret-jwt-key-2026';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Missing or invalid Bearer token.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
    return;
  }
}

export function generateToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
}
