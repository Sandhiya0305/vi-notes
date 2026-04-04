import app, { connectToDatabase } from './index';

const port = Number(process.env.PORT ?? 3001);

async function startDevServer(): Promise<void> {
  await connectToDatabase();

  app.listen(port, () => {
    console.log(`✓ Vi-Notes server listening on http://localhost:${port}`);
    console.log(`   API endpoint: http://localhost:${port}/api`);
    console.log(`   Health check: http://localhost:${port}/health`);
  });
}

startDevServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});