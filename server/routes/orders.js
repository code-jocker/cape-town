import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as orders from '../controllers/orderController.js';

const router = Router();

router.use(requireAuth);

const statusSchema = z.object({
  status: z.enum(['accepted', 'preparing', 'ready', 'served', 'paid']),
  reason: z.string().max(300).optional()
});
const cancelSchema = z.object({ reason: z.string().min(3).max(300) });
const paySchema = z.object({ method: z.enum(['cash', 'card', 'momo']) });
const editSchema = z.object({ notes: z.string().max(300) });

router.get('/', orders.listOrders);
router.get('/stats/live', orders.liveStats);
router.get('/:id', orders.getOrder);
router.patch('/:id/status', validate(statusSchema), orders.patchStatus);
router.patch('/:id', requireRole('manager'), validate(editSchema), orders.patchOrder);
router.post('/:id/cancel', validate(cancelSchema), orders.cancelOrder);
router.post('/:id/pay', requireRole('waiter', 'manager', 'chef'), validate(paySchema), orders.pay);

export default router;
