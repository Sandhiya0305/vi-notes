import cors from 'cors';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import analysisRouter from './routes/analysis';
import sessionsRouter from './routes/sessions';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3001);
const mongoUri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/vi-notes';

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

app.use('/api/sessions', sessionsRouter);
app.use('/api/analysis', analysisRouter);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof Error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(500).json({ error: 'Internal server error' });
});

async function startServer(): Promise<void> {
  await mongoose.connect(mongoUri);
  app.listen(port, () => {
    console.log(`Vi-Notes server listening on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
