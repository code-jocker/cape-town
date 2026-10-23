import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as sessions from '../controllers/sessionController.js';

const router = Router();

router.use(requireAuth);

const paySchema = z.object({ method: z.enum(['cash', 'card', 'momo']) });
const closeSchema = z.object({ force: z.boolean().optional() });

router.get('/', sessions.listSessions);
router.get('/:id', sessions.getSession);
router.post('/:id/close', requireRole('waiter', 'manager', 'chef'), validate(closeSchema), sessions.close);
router.post('/:id/pay', requireRole('waiter', 'manager', 'chef'), validate(paySchema), sessions.payWholeSession);

export default router;
