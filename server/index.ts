import cors from 'cors';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'path';
import mongoose from 'mongoose';
import analysisRouter from './routes/analysis';
import authRouter from './routes/auth';
import reportsRouter from './routes/reports';
import sessionsRouter from './routes/sessions';
import usersRouter from './routes/users';

const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath, override: true });

const app = express();
const port = Number(process.env.PORT ?? 3001);
const mongoUri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/vi-notes';
const clientDevUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173';

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'vi-notes-server' });
});

app.get('/', (_req, res) => {
  if (process.env.NODE_ENV === 'development') {
    const viteClientProbe = `${clientDevUrl}/@vite/client`;
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Starting Vi-Notes</title>
</head>
<body style="font-family: sans-serif; padding: 2rem; color: #111827;">
  <h1 style="margin: 0 0 0.5rem; font-size: 1.25rem;">Starting Vi-Notes...</h1>
  <p style="margin: 0; color: #4b5563;">Waiting for the frontend dev server on ${clientDevUrl}.</p>
  <script>
    (function waitForClient() {
      var probe = document.createElement('script');
      probe.src = '${viteClientProbe}';
      probe.async = true;
      probe.onload = function () {
        window.location.replace('${clientDevUrl}');
      };
      probe.onerror = function () {
        setTimeout(waitForClient, 1000);
      };
      document.head.appendChild(probe);
    })();
  </script>
</body>
</html>`;

    return res.status(200).type('html').send(html);
  }

  return res.status(404).json({ error: 'Frontend is served separately in development' });
});

app.use('/api/auth', authRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/users', usersRouter);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof Error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(500).json({ error: 'Internal server error' });
});

async function startServer(): Promise<void> {
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    console.log('✔ Connected to MongoDB');
  } catch (mongoError) {
    console.error('❌ MongoDB connection failed');
    console.error(`   Tried: ${mongoUri.substring(0, 60)}...`);
    if (mongoError instanceof Error) {
      console.error(`   Error: ${mongoError.message}`);
    }
    console.error('\n⚠️  Troubleshooting:');
    console.error('   1. Check MONGODB_URI in .env file');
    console.error('   2. Verify MongoDB Atlas IP whitelist includes your IP');
    console.error('   3. Check database credentials');
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`✓ Vi-Notes server listening on http://localhost:${port}`);
    console.log(`   API endpoint: http://localhost:${port}/api`);
    console.log(`   Health check: http://localhost:${port}/health`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
