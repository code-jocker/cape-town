import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as promos from '../controllers/promoController.js';

const router = Router();

const promoSchema = z.object({
  code: z.string().min(3).max(30).regex(/^[A-Z0-9_-]+$/i, 'letters/numbers only'),
  type: z.enum(['percent', 'fixed']),
  value: z.number().min(0).max(1_000_000),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().nullable().optional(),
  maxUses: z.number().int().min(0).optional(),
  isActive: z.boolean().optional()
});

router.use(requireAuth, requireRole('manager'));

router.get('/', promos.listPromos);
router.post('/', validate(promoSchema), promos.createPromo);
router.patch('/:id', validate(promoSchema.partial()), promos.updatePromo);
router.delete('/:id', promos.deletePromo);

export default router;
