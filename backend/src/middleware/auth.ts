import { Request, Response, NextFunction } from 'express';
import { signJwtToken, verifyJwtToken } from '../config/security.js';

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
    const decoded = verifyJwtToken<{ userId?: string; id?: string; email: string }>(token);
    const uid = decoded.userId || decoded.id;
    if (!uid) {
      res.status(401).json({ error: 'Invalid token payload: missing user identifier.' });
      return;
    }
    req.userId = uid;
    req.userEmail = decoded.email;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
    return;
  }
}

export function generateToken(userId: string, email: string): string {
  return signJwtToken({ userId, email }, { expiresIn: '7d' });
}

