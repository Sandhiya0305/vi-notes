import fs from 'fs';
import nodemailer from 'nodemailer';
import path from 'path';
import dotenv from 'dotenv';

let transport: nodemailer.Transporter | null = null;
let cachedConfigKey: string | null = null;
let envInitialized = false;

type SmtpConfig = {
  smtpHost: string;
  smtpPort: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFrom: string;
  smtpSecure: boolean;
};

function initializeEnv(): void {
  if (envInitialized) {
    return;
  }

  const candidatePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
  ];

  for (const candidatePath of candidatePaths) {
    if (fs.existsSync(candidatePath)) {
      dotenv.config({ path: candidatePath, override: false });
      break;
    }
  }

  envInitialized = true;
}

function getSmtpConfig(): SmtpConfig {
  initializeEnv();

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT ?? 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpFrom = process.env.SMTP_FROM;
  const smtpSecure = (process.env.SMTP_SECURE ?? '').toLowerCase() === 'true';

  if (!smtpHost || !smtpFrom) {
    throw new Error('SMTP_HOST and SMTP_FROM must be configured to send verification emails');
  }

  return { smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom, smtpSecure };
}

function getTransport(): { transporter: nodemailer.Transporter; smtpFrom: string } {
  const config = getSmtpConfig();
  const configKey = [
    config.smtpHost,
    String(config.smtpPort),
    config.smtpUser ?? '',
    config.smtpFrom,
    String(config.smtpSecure),
  ].join('|');

  if (transport && cachedConfigKey === configKey) {
    return { transporter: transport, smtpFrom: config.smtpFrom };
  }

  transport = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: config.smtpUser && config.smtpPassword ? { user: config.smtpUser, pass: config.smtpPassword } : undefined,
  });
  cachedConfigKey = configKey;

  return { transporter: transport, smtpFrom: config.smtpFrom };
}

export async function sendVerificationEmail(email: string, otpCode: string, expiresAt: Date): Promise<void> {
  const { transporter, smtpFrom } = getTransport();
  const formattedExpiry = expiresAt.toLocaleString();

  await transporter.sendMail({
    from: smtpFrom,
    to: email,
    subject: 'Your Vi-Notes verification code',
    text: [
      'Your Vi-Notes verification code is:',
      '',
      otpCode,
      '',
      `This code expires at ${formattedExpiry}.`,
      'If you did not request this account, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2 style="margin: 0 0 16px;">Your Vi-Notes verification code</h2>
        <p style="margin: 0 0 12px;">Use this code to finish creating your account:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 0.2em; margin: 16px 0;">${otpCode}</div>
        <p style="margin: 0 0 8px;">This code expires at ${formattedExpiry}.</p>
        <p style="margin: 0; color: #6b7280;">If you did not request this account, you can ignore this email.</p>
      </div>
    `,
  });
}
