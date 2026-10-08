import { Router } from 'express';
import mongoose from 'mongoose';
import { config } from '../config/env.js';

import authRoutes from './auth.js';
import publicRoutes from './public.js';
import menuRoutes from './menu.js';
import orderRoutes from './orders.js';
import sessionRoutes from './sessions.js';
import requestRoutes from './requests.js';
import tableRoutes from './tables.js';
import staffRoutes from './staff.js';
import reportRoutes from './reports.js';
import uploadRoutes from './upload.js';
import settingsRoutes from './settings.js';
import promoRoutes from './promos.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    data: {
      status: 'up',
      env: config.env,
      db: mongoose.connection.readyState === 1 ? 'connected' : 'down',
      time: new Date().toISOString()
    }
  });
});

router.use('/auth', authRoutes);
router.use('/public', publicRoutes);
router.use('/menu', menuRoutes);
router.use('/orders', orderRoutes);
router.use('/sessions', sessionRoutes);
router.use('/requests', requestRoutes);
router.use('/tables', tableRoutes);
router.use('/staff', staffRoutes);
router.use('/reports', reportRoutes);
router.use('/upload', uploadRoutes);
router.use('/', settingsRoutes); // /settings, /audit-logs
router.use('/promos', promoRoutes);

export default router;
