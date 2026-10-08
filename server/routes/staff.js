import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as staff from '../controllers/staffController.js';

const router = Router();

const createSchema = z.object({
  name: z.string().min(2).max(80),
  username: z.string().min(3).max(40).regex(/^[a-z0-9._-]+$/i, 'letters, numbers, dots, dashes only'),
  email: z.string().email().optional(),
  password: z.string().min(6).max(200),
  role: z.enum(['manager', 'chef', 'waiter'])
});

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  role: z.enum(['manager', 'chef', 'waiter']).optional(),
  isActive: z.boolean().optional()
});

const resetSchema = z.object({ password: z.string().min(6).max(200) });

router.use(requireAuth, requireRole('manager'));

router.get('/', staff.listStaff);
router.post('/', validate(createSchema), staff.createStaff);
router.patch('/:id', validate(updateSchema), staff.updateStaff);
router.post('/:id/reset-password', validate(resetSchema), staff.resetPassword);

export default router;
