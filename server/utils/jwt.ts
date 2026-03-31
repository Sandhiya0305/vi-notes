import { createHmac, timingSafeEqual } from 'node:crypto';
import type { UserRole } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET ?? 'vi-notes-secret';
const JWT_EXPIRATION_SECONDS = Number(process.env.JWT_EXPIRATION_SECONDS ?? 60 * 60 * 4);

const HEADER = {
  alg: 'HS256',
  typ: 'JWT',
};

function base64UrlEncode(value: Buffer): string {
  return value.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value: string): Buffer {
  const padded = value.padEnd(value.length + (4 - (value.length % 4)) % 4, '=');
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function signSegment(data: string): string {
  return createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export function signJwt(
  payload: { userId: string; email: string; role: UserRole },
  expiresInSeconds = JWT_EXPIRATION_SECONDS,
): { token: string; expiresAt: number } {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + expiresInSeconds;
  const encodedHeader = base64UrlEncode(Buffer.from(JSON.stringify(HEADER), 'utf8'));
  const encodedPayload = base64UrlEncode(
    Buffer.from(JSON.stringify({ ...payload, iat: issuedAt, exp: expiresAt }), 'utf8'),
  );
  const signature = signSegment(`${encodedHeader}.${encodedPayload}`);
  return {
    token: `${encodedHeader}.${encodedPayload}.${signature}`,
    expiresAt,
  };
}

export function verifyJwt(token: string): JwtPayload | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const reconstructed = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = signSegment(reconstructed);

  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payloadBuffer = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(payloadBuffer.toString('utf8')) as JwtPayload;

    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
