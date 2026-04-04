import { Router } from 'express';
import { randomBytes, randomInt } from 'node:crypto';
import { z } from 'zod';
import UserModel from '../models/User';
import PendingOtpRegistrationModel from '../models/PendingOtpRegistration';
import { sendVerificationEmail } from '../services/emailService';
import { signJwt } from '../utils/jwt';
import { verifyPassword, createPasswordHash } from '../utils/passwordHash';
import type { PendingOtpRegistrationDocument } from '../models/PendingOtpRegistration';
import type {
  AuthSessionResponse,
  RegisterInitiationResponse,
  RegisterRequest,
  VerifyRegistrationRequest,
} from '../../types';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
}) satisfies z.ZodType<RegisterRequest>;

const verifyRegistrationSchema = z.object({
  verificationToken: z.string().min(16),
  otpCode: z.string().regex(/^\d{6}$/),
}) satisfies z.ZodType<VerifyRegistrationRequest>;

const resendRegistrationSchema = z.object({
  verificationToken: z.string().min(16),
});

const OTP_TTL_MINUTES = 15;
const OTP_ATTEMPT_LIMIT = 5;

function buildAuthResponse(user: { _id: unknown; email: string; name?: string; role: 'admin' | 'user' }): AuthSessionResponse {
  const { token, expiresAt } = signJwt({
    userId: String(user._id),
    email: user.email,
    role: user.role,
  });

  const userName = user.name || user.email.split('@')[0];

  return {
    token,
    expiresAt,
    user: {
      id: String(user._id),
      email: user.email,
      name: userName,
      role: user.role,
    },
  };
}

async function createPendingRegistration(payload: RegisterRequest, normalizedEmail: string) {
  const verificationToken = randomBytes(32).toString('hex');
  const otpCode = String(randomInt(100000, 1000000));
  const { hash, salt } = createPasswordHash(payload.password);
  const otpHash = createPasswordHash(otpCode);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await PendingOtpRegistrationModel.create({
    email: normalizedEmail,
    name: payload.name,
    passwordHash: hash,
    passwordSalt: salt,
    role: 'user',
    verificationToken,
    otpHash: otpHash.hash,
    otpSalt: otpHash.salt,
    attempts: 0,
    expiresAt,
  });

  try {
    await sendVerificationEmail(normalizedEmail, otpCode, expiresAt);
    return { verificationToken, expiresAt };
  } catch (error) {
    await PendingOtpRegistrationModel.deleteOne({ verificationToken });
    throw error;
  }
}

async function refreshPendingRegistrationOtp(pending: PendingOtpRegistrationDocument) {

  const otpCode = String(randomInt(100000, 1000000));
  const otpHash = createPasswordHash(otpCode);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  pending.otpHash = otpHash.hash;
  pending.otpSalt = otpHash.salt;
  pending.attempts = 0;
  pending.expiresAt = expiresAt;
  await pending.save();

  try {
    await sendVerificationEmail(pending.email, otpCode, expiresAt);
    return {
      verificationToken: pending.verificationToken,
      expiresAt,
    };
  } catch (error) {
    await PendingOtpRegistrationModel.deleteOne({ _id: pending._id });
    throw error;
  }
}

router.post('/login', async (req, res, next) => {
  try {
    const credentials = loginSchema.parse(req.body);
    const normalizedEmail = credentials.email.toLowerCase();
    const user = await UserModel.findOne({ email: normalizedEmail });
    const pendingRegistration = await PendingOtpRegistrationModel.findOne({
      email: normalizedEmail,
    });

    // Check if attempting to login as admin via SMTP_USER/SMTP_PASSWORD
    const smtpAdminEmail = process.env.SMTP_USER?.trim().toLowerCase();
    const smtpAdminPassword = process.env.SMTP_PASSWORD?.trim();
    const isSmtpAdminAttempt =
      Boolean(smtpAdminEmail) &&
      Boolean(smtpAdminPassword) &&
      normalizedEmail === smtpAdminEmail &&
      credentials.password === smtpAdminPassword;

    const isAdminAttempt = isSmtpAdminAttempt;

    if (isAdminAttempt) {
      const { hash, salt } = createPasswordHash(credentials.password);
      const adminName = 'Admin';

      if (!user) {
        const createdAdmin = await UserModel.create({
          email: normalizedEmail,
          name: adminName,
          passwordHash: hash,
          passwordSalt: salt,
          role: 'admin',
        });

        return res.json(buildAuthResponse(createdAdmin));
      }

      let didUpdate = false;
      if (user.role !== 'admin') {
        user.role = 'admin';
        didUpdate = true;
      }

      if (user.name !== adminName) {
        user.name = adminName;
        didUpdate = true;
      }

      if (!verifyPassword(credentials.password, user.passwordHash, user.passwordSalt)) {
        user.passwordHash = hash;
        user.passwordSalt = salt;
        didUpdate = true;
      }

      if (didUpdate) {
        await user.save();
      }

      return res.json(buildAuthResponse(user));
    }

    if (!user && pendingRegistration) {
      return res.status(403).json({
        error:
          'Please enter the verification code we emailed during registration before signing in.',
      });
    }

    if (!user || !verifyPassword(credentials.password, user.passwordHash, user.passwordSalt)) {
      return res.status(401).json({ error: 'Invalid login credentials' });
    }

    return res.json(buildAuthResponse(user));
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

    const pending = await PendingOtpRegistrationModel.findOne({ email: normalizedEmail });
    if (pending && pending.expiresAt.getTime() <= Date.now()) {
      await PendingOtpRegistrationModel.deleteOne({ _id: pending._id });
    } else if (pending) {
      const refreshed = await refreshPendingRegistrationOtp(pending);

      const response: RegisterInitiationResponse = {
        verificationRequired: true,
        verificationToken: refreshed.verificationToken,
        expiresAt: refreshed.expiresAt.getTime(),
        message: 'A verification is already pending. We sent you a fresh code by email.',
      };

      return res.status(202).json(response);
    }

    const { verificationToken, expiresAt } = await createPendingRegistration(payload, normalizedEmail);

    const response: RegisterInitiationResponse = {
      verificationRequired: true,
      verificationToken,
      expiresAt: expiresAt.getTime(),
      message: 'We generated a one-time code for your registration. Enter it to finish creating your account.',
    };

    return res.status(202).json(response);
  } catch (error) {
    return next(error);
  }
});

router.post('/register/verify', async (req, res, next) => {
  try {
    const payload = verifyRegistrationSchema.parse(req.body);
    const pending = await PendingOtpRegistrationModel.findOne({ verificationToken: payload.verificationToken });

    if (!pending) {
      return res.status(400).json({ error: 'Verification code expired or invalid' });
    }

    if (pending.expiresAt.getTime() <= Date.now()) {
      await PendingOtpRegistrationModel.deleteOne({ _id: pending._id });
      return res.status(400).json({ error: 'Verification code expired or invalid' });
    }

    if (pending.attempts >= OTP_ATTEMPT_LIMIT) {
      await PendingOtpRegistrationModel.deleteOne({ _id: pending._id });
      return res.status(429).json({ error: 'Too many invalid verification attempts' });
    }

    const isValid = verifyPassword(payload.otpCode, pending.otpHash, pending.otpSalt);
    if (!isValid) {
      pending.attempts += 1;
      await pending.save();
      return res.status(400).json({ error: 'Incorrect verification code' });
    }

    const existingUser = await UserModel.findOne({ email: pending.email });
    if (existingUser) {
      await PendingOtpRegistrationModel.deleteOne({ _id: pending._id });
      return res.status(409).json({ error: 'Email already registered' });
    }

    const created = await UserModel.create({
      email: pending.email,
      name: pending.name,
      passwordHash: pending.passwordHash,
      passwordSalt: pending.passwordSalt,
      role: pending.role,
    });

    await PendingOtpRegistrationModel.deleteOne({ _id: pending._id });

    return res.status(201).json(buildAuthResponse(created));
  } catch (error) {
    return next(error);
  }
});

router.post('/register/resend', async (req, res, next) => {
  try {
    const payload = resendRegistrationSchema.parse(req.body);
    const pending = await PendingOtpRegistrationModel.findOne({ verificationToken: payload.verificationToken });

    if (!pending) {
      return res.status(400).json({ error: 'Verification code expired or invalid' });
    }

    if (pending.expiresAt.getTime() <= Date.now()) {
      await PendingOtpRegistrationModel.deleteOne({ _id: pending._id });
      return res.status(400).json({ error: 'Verification code expired or invalid' });
    }

    const refreshed = await refreshPendingRegistrationOtp(pending);

    return res.json({
      verificationRequired: true,
      verificationToken: refreshed.verificationToken,
      expiresAt: refreshed.expiresAt.getTime(),
      message: 'A fresh verification code has been sent to your email address.',
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
