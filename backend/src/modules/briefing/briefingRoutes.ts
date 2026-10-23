import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';
import { BriefingService } from './briefingService.js';

export const briefingRouter = Router();
briefingRouter.use(authMiddleware);

// Get current daily briefing
briefingRouter.get('/today', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  try {
    const briefing = BriefingService.generateBriefing(userId);
    res.json(briefing);
  } catch (err: any) {
    console.error('Error generating briefing:', err);
    res.status(500).json({ error: 'Failed to generate daily briefing.' });
  }
});
