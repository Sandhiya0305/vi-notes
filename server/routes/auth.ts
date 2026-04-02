import { Router } from 'express';
import { z } from 'zod';
import UserModel from '../models/User';
import { signJwt } from '../utils/jwt';
import { verifyPassword, createPasswordHash } from '../utils/passwordHash';
import type { RegisterRequest } from '../../types';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
}) satisfies z.ZodType<RegisterRequest>;

router.post('/login', async (req, res, next) => {
  try {
    const credentials = loginSchema.parse(req.body);
    const normalizedEmail = credentials.email.toLowerCase();
    const user = await UserModel.findOne({ email: normalizedEmail });

    if (!user || !verifyPassword(credentials.password, user.passwordHash, user.passwordSalt)) {
      return res.status(401).json({ error: 'Invalid login credentials' });
    }

    const { token, expiresAt } = signJwt({
      userId: String(user._id),
      email: user.email,
      role: user.role,
    });

    return res.json({
      token,
      expiresAt,
      user: {
        id: String(user._id),
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);
    const normalizedEmail = payload.email.toLowerCase();
    const existing = await UserModel.findOne({ email: normalizedEmail });

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const { hash, salt } = createPasswordHash(payload.password);
    const created = await UserModel.create({
      email: normalizedEmail,
      passwordHash: hash,
      passwordSalt: salt,
      role: 'user',
    });

    const { token, expiresAt } = signJwt({
      userId: String(created._id),
      email: created.email,
      role: created.role,
    });

    return res.status(201).json({
      token,
      expiresAt,
      user: {
        id: String(created._id),
        email: created.email,
        role: created.role,
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
