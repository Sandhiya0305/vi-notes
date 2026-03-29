import { Router } from 'express';
import { z } from 'zod';
import SessionModel from '../models/Session';
import ReportExporter from '../services/reportExporter';
import type { EndSessionRequest, StartSessionRequest, UpdateSessionRequest } from '../../types';

const router = Router();

const keystrokeSchema = z.object({
  timestamp: z.number(),
  key: z.string(),
  keyCategory: z.enum(['alpha', 'numeric', 'whitespace', 'punctuation', 'navigation', 'delete', 'modifier', 'special']),
  intervalMs: z.number().min(0),
  documentLength: z.number().min(0),
});

const pasteSchema = z.object({
  timestamp: z.number(),
  insertedText: z.string(),
  insertedLength: z.number().min(0),
  documentLength: z.number().min(0),
});

const editSchema = z.object({
  timestamp: z.number(),
  type: z.enum(['insert', 'delete', 'replace']),
  delta: z.number(),
  documentLength: z.number().min(0),
});

const startSchema = z.object({
  documentSnapshot: z.string().optional(),
}) satisfies z.ZodType<StartSessionRequest>;

const updateSchema = z.object({
  sessionId: z.string().min(1),
  documentSnapshot: z.string(),
  keystrokes: z.array(keystrokeSchema),
  pastes: z.array(pasteSchema),
  edits: z.array(editSchema),
  sessionDurationMs: z.number().min(0),
}) satisfies z.ZodType<UpdateSessionRequest>;

const endSchema = updateSchema satisfies z.ZodType<EndSessionRequest>;

router.post('/start', async (req, res, next) => {
  try {
    const body = startSchema.parse(req.body);

    const session = await SessionModel.create({
      documentSnapshot: body.documentSnapshot ?? '',
      keystrokes: [],
      pastes: [],
      edits: [],
      sessionDurationMs: 0,
      status: 'active',
      analysis: null,
    });

    res.status(201).json({ session: session.toJSON() });
  } catch (error) {
    next(error);
  }
});

router.post('/update', async (req, res, next) => {
  try {
    const body = updateSchema.parse(req.body);
    const session = await SessionModel.findById(body.sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.documentSnapshot = body.documentSnapshot;
    session.keystrokes.push(...body.keystrokes);
    session.pastes.push(...body.pastes);
    session.edits.push(...body.edits);
    session.sessionDurationMs = body.sessionDurationMs;

    await session.save();

    return res.json({ session: session.toJSON() });
  } catch (error) {
    return next(error);
  }
});

router.post('/end', async (req, res, next) => {
  try {
    const body = endSchema.parse(req.body);
    const session = await SessionModel.findById(body.sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.documentSnapshot = body.documentSnapshot;
    session.keystrokes.push(...body.keystrokes);
    session.pastes.push(...body.pastes);
    session.edits.push(...body.edits);
    session.sessionDurationMs = body.sessionDurationMs;
    session.status = 'completed';

    await session.save();

    return res.json({ session: session.toJSON() });
  } catch (error) {
    return next(error);
  }
});

router.get('/', async (_req, res, next) => {
  try {
    const sessions = await SessionModel.find().sort({ createdAt: -1 }).lean();
    res.json(Array.isArray(sessions) ? sessions.map((session) => ({ ...session, _id: String(session._id) })) : []);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const session = await SessionModel.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.json({ session: session.toJSON() });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await SessionModel.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.json({ deletedSessionId: req.params.id });
  } catch (error) {
    return next(error);
  }
});

// Export endpoints
router.get('/:id/export/:format', async (req, res, next) => {
  try {
    const session = await SessionModel.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!session.analysis) {
      return res.status(400).json({ error: 'Session analysis not yet performed. Run /api/analysis/:sessionId first.' });
    }

    const format = (req.params.format as 'json' | 'html' | 'text') || 'html';
    if (!['json', 'html', 'text'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Use: json, html, or text' });
    }

    const exporter = new ReportExporter();
    const exported = exporter.export(session.analysis, format);

    res.setHeader('Content-Type', exported.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
    res.send(exported.content);
  } catch (error) {
    return next(error);
  }
});

// Generate shareable token
router.get('/:id/share-token', async (req, res, next) => {
  try {
    const session = await SessionModel.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!session.analysis) {
      return res.status(400).json({ error: 'Session analysis not yet performed.' });
    }

    const exporter = new ReportExporter();
    const token = exporter.generateShareableToken(session.analysis);

    return res.json({
      token,
      shareUrl: `/share/${token}`,
      reportSummary: {
        verdict: session.analysis.verdict,
        confidence: session.analysis.confidenceScore,
        suspicion: session.analysis.overallSuspicionScore,
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
