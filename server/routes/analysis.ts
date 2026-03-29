import { Router } from 'express';
import SessionModel from '../models/Session';
import { analyzeSessionBehavior } from '../services/behavioralAnalysis';

const router = Router();

router.post('/:sessionId', async (req, res, next) => {
  try {
    const session = await SessionModel.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const report = analyzeSessionBehavior({
      _id: String(session._id),
      documentSnapshot: session.documentSnapshot,
      keystrokes: session.keystrokes,
      pastes: session.pastes,
      edits: session.edits,
      sessionDurationMs: session.sessionDurationMs,
    });

    session.analysis = report;
    await session.save();

    return res.json({ report });
  } catch (error) {
    return next(error);
  }
});

export default router;
