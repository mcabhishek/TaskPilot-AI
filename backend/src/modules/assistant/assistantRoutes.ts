import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';
import { AssistantService } from './assistantService.js';

export const assistantRouter = Router();
assistantRouter.use(authMiddleware);

// Process voice/text command
assistantRouter.post('/command', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { text } = req.body;

  if (!text || !text.trim()) {
    res.status(400).json({ error: 'Text or speech transcript is required.' });
    return;
  }

  try {
    const result = await AssistantService.processCommand(userId, text);
    res.json(result);
  } catch (err: any) {
    console.error('Error processing assistant command:', err);
    res.status(500).json({ error: err.message || 'Failed to process assistant command.' });
  }
});
