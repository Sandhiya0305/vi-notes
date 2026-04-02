import { Router } from 'express';
import SessionModel from '../models/Session';
import ReportModel from '../models/Report';
import { analyzeSessionBehavior } from '../services/behavioralAnalysis';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';

const router = Router();

router.post('/:sessionId', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const session = await SessionModel.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'admin' && session.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Insufficient permissions to analyze this session' });
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

    await ReportModel.create({
      userId: session.ownerId,
      userEmail: session.ownerEmail,
      sessionId: report.sessionId,
      generatedAt: report.generatedAt,
      verdict: report.verdict,
      confidenceScore: report.confidenceScore,
      overallSuspicionScore: report.overallSuspicionScore,
    });

    return res.json({ report });
  } catch (error) {
    return next(error);
  }
});

export default router;
