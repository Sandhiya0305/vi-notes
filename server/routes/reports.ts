import { Router } from 'express';
import ReportModel from '../models/Report';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', requireRole('admin'), async (_req, res, next) => {
  try {
    const reports = await ReportModel.find().sort({ createdAt: -1 }).lean();
    return res.json({ reports });
  } catch (error) {
    return next(error);
  }
});

export default router;
