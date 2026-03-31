import { timingSafeEqual, pbkdf2Sync, randomBytes } from 'node:crypto';

const ITERATIONS = 120000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';
const SALT_BYTES = 16;

export interface PasswordHash {
  hash: string;
  salt: string;
}

export function createPasswordHash(password: string, salt?: string): PasswordHash {
  const usedSalt = salt ?? randomBytes(SALT_BYTES).toString('hex');
  const derived = pbkdf2Sync(password, usedSalt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return {
    hash: derived,
    salt: usedSalt,
  };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  if (!password || !hash || !salt) {
    return false;
  }

  const derived = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);
  const existing = Buffer.from(hash, 'hex');

  if (existing.length !== derived.length) {
    return false;
  }

  return timingSafeEqual(existing, derived);
}
