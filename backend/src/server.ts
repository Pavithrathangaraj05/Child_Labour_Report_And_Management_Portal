import fs from 'fs';
import mongoose from 'mongoose';
import { app } from './app';
import { env } from './config/env';

import { initPostgresPool } from './config/postgres';

async function main() {
  fs.mkdirSync(env.UPLOAD_DIR, { recursive: true, mode: 0o700 });
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  console.log('MongoDB connected');
  await initPostgresPool();
  const server = app.listen(env.PORT, () => console.log(`CHILD-SAFE API listening on http://localhost:${env.PORT}`));
  const shutdown = async () => { server.close(); await mongoose.disconnect(); process.exit(0); };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}
main().catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });
