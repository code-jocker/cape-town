import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import { config } from './config/env.js';
import apiRoutes from './routes/index.js';
import { requestId } from './middleware/requestId.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestId);
  app.use((req, res, next) => {
    const shouldLog = req.path.startsWith('/api/') || req.path === '/health' || req.path === '/ready';
    if (!shouldLog) return next();

    const startedAt = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      logger.info(
        {
          reqId: req.id,
          method: req.method,
          route: req.route?.path || (req.path === '/health' || req.path === '/ready' ? req.path : '<unmatched>'),
          status: res.statusCode,
          durationMs: Math.round(durationMs * 10) / 10
        },
        'request completed'
      );
    });
    next();
  });
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", 'ws:', 'wss:'],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'self'"],
          upgradeInsecureRequests: config.isProd ? [] : null
        }
      },
       crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
  );
  app.use(cors({ origin: config.corsOrigin.includes('*') ? true : config.corsOrigin, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '256kb' }));
  app.use(mongoSanitize());

  // Static assets: long cache for hashed-irrelevant public files, HTML no-cache
  const pubDir = path.resolve(process.cwd(), 'public');
  app.use(
    express.static(pubDir, {
      etag: true,
      setHeaders(res, filePath) {
        if (filePath.endsWith('.html') || filePath.endsWith('.pdf')) {
          res.setHeader('Cache-Control', 'no-cache');
        } else if (/\.(css|js|svg|png|webp|woff2|json|ico)$/.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=3600');
        }
      }
    })
  );
  app.use('/uploads', express.static(path.resolve(process.cwd(), config.uploadDir), { maxAge: '7d', immutable: true }));

  app.get('/menu', (req, res) => res.sendFile(path.join(pubDir, 'customer', 'index.html')));
  app.get('/customer', (req, res) => res.redirect(302, `/menu${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`));
  app.get('/customer/', (req, res) => res.redirect(302, `/menu${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`));
  app.get('/sw.js', (req, res) => {
    res.set('Service-Worker-Allowed', '/');
    res.sendFile(path.join(pubDir, 'sw.js'));
  });

  // Open health check at the root (spec §10), in addition to /api/health.
  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      data: {
        status: 'up',
        env: config.env,
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        time: new Date().toISOString()
      }
    });
  });

  app.get('/ready', (_req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;
    res.status(dbConnected ? 200 : 503).json({
      ok: dbConnected,
      data: { status: dbConnected ? 'ready' : 'not_ready', db: dbConnected ? 'connected' : 'disconnected' }
    });
  });

  app.use('/api', apiLimiter, apiRoutes);
  app.use('/api', notFound);
  app.use(errorHandler);

  // Ensure upload dir exists
  fs.mkdirSync(path.resolve(process.cwd(), config.uploadDir), { recursive: true });

  logger.debug('Express app configured');
  return app;
}
