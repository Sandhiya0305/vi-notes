import UserModel from '../models/User';
import { createPasswordHash } from '../utils/passwordHash';

interface SeedUser {
  email: string;
  password: string;
  role: 'admin' | 'user';
}

const seedUsers: SeedUser[] = [
  {
    email: process.env.SEED_ADMIN_EMAIL?.trim() ?? 'admin@vi-notes.local',
    password: process.env.SEED_ADMIN_PASSWORD?.trim() ?? 'AdminPass!2026',
    role: 'admin',
  },
  {
    email: process.env.SEED_USER_EMAIL?.trim() ?? 'writer@vi-notes.local',
    password: process.env.SEED_USER_PASSWORD?.trim() ?? 'WriterPass!2026',
    role: 'user',
  },
];

export async function ensureSeededUsers(): Promise<void> {
  for (const userSpec of seedUsers) {
    const normalizedEmail = userSpec.email.toLowerCase();
    const existing = await UserModel.findOne({ email: normalizedEmail });
    if (existing) {
      continue;
    }

    const { hash, salt } = createPasswordHash(userSpec.password);
    await UserModel.create({
      email: normalizedEmail,
      passwordHash: hash,
      passwordSalt: salt,
      role: userSpec.role,
    });

    console.log(`Created ${userSpec.role} user: ${normalizedEmail}`);
  }
}
