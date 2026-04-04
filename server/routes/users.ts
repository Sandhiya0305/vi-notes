import { Router } from 'express';
import UserModel from '../models/User';
import SessionModel from '../models/Session';
import ReportModel from '../models/Report';
import PendingOtpRegistrationModel from '../models/PendingOtpRegistration';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/', async (_req, res, next) => {
  try {
    const [users, sessionCounts] = await Promise.all([
      UserModel.find().sort({ createdAt: 1 }).lean(),
      SessionModel.aggregate([
        { $group: { _id: '$ownerId', sessionCount: { $sum: 1 } } },
      ]),
    ]);

    const countByOwnerId = new Map<string, number>(
      sessionCounts.map((entry: { _id: string; sessionCount: number }) => [String(entry._id), entry.sessionCount]),
    );

    return res.json({
      users: users.map((user) => ({
        id: String(user._id),
        name: typeof user.name === 'string' && user.name.trim().length > 0 ? user.name : 'Unknown User',
        email: user.email,
        role: user.role,
        sessionCount: countByOwnerId.get(String(user._id)) ?? 0,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const targetUserId = req.params.id;

    if (!targetUserId) {
      return res.status(400).json({ error: 'User id is required' });
    }

    if (req.user?.id === targetUserId) {
      return res.status(400).json({ error: 'You cannot delete your own admin account' });
    }

    const user = await UserModel.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [sessionDeleteResult, reportDeleteResult] = await Promise.all([
      SessionModel.deleteMany({ ownerId: targetUserId }),
      ReportModel.deleteMany({ userId: targetUserId }),
    ]);

    await PendingOtpRegistrationModel.deleteMany({ email: user.email });
    await user.deleteOne();

    return res.json({
      deletedUserId: targetUserId,
      deletedSessions: sessionDeleteResult.deletedCount ?? 0,
      deletedReports: reportDeleteResult.deletedCount ?? 0,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
