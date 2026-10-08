import mongoose from 'mongoose';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

const RETRY_MAX = 10;

/**
 * Connect to MongoDB with retry + backoff.
 * In development with no MONGODB_URI, spins up an in-memory MongoDB
 * (mongodb-memory-server) so the app runs with zero external setup.
 */
export async function connectDB() {
  let uri = config.mongoUri;

  if (!uri && !config.isProd) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mem = await MongoMemoryServer.create();
    uri = mem.getUri('cape-town-k-hotel');
    logger.warn({ uri }, 'No MONGODB_URI set — using in-memory MongoDB (data resets on restart)');
  }

  for (let attempt = 1; attempt <= RETRY_MAX; attempt++) {
    try {
      const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
      logger.info({ host: conn.connection.host, db: conn.connection.name }, 'MongoDB connected');

      conn.connection.on('error', (err) => logger.error({ err }, 'MongoDB error'));
      conn.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
      return conn;
    } catch (err) {
      const delay = Math.min(1000 * 2 ** attempt, 15000);
      logger.error({ attempt, err: err.message }, 'MongoDB connection failed, retrying...');
      if (attempt === RETRY_MAX) throw err;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

// Log slow queries (> 200ms)
mongoose.set('debug', (collection, method, query, doc, options) => {
  const ms = options?.duration;
  if (ms && ms > 200) logger.warn({ collection, method, ms }, 'Slow query');
});
