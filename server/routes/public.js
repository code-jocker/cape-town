import { Router } from 'express';
import { z } from 'zod';
import { requireTable } from '../middleware/tableAuth.js';
import { validate } from '../middleware/validate.js';
import * as pub from '../controllers/publicController.js';

const router = Router();

// requireTable is applied per-route (not via router.use) so that the
// /table/:token route can read the token from req.params after matching.

const optionSelectionSchema = z.object({
  name: z.string().min(1).max(80),
  choices: z.array(z.string().min(1).max(80)).max(5).default([])
});

const orderSchema = z.object({
  tableToken: z.string().optional(), // alternative to header/query
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.number().int().min(1).max(50),
        selectedOptions: z.array(optionSelectionSchema).max(6).default([]),
        note: z.string().max(200).optional()
      })
    )
    .min(1)
    .max(30),
  notes: z.string().max(300).optional(),
  promoCode: z.string().max(40).optional(),
  idempotencyKey: z.string().min(8).max(80)
});

const requestSchema = z.object({
  tableToken: z.string().optional(),
  type: z.enum(['waiter', 'bill', 'water', 'other'])
});

const feedbackSchema = z.object({
  sid: z.string().min(6).max(64),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional()
});

router.get('/menu', requireTable, pub.getMenu);
router.get('/table/:token', requireTable, pub.getTableByToken);
router.post('/orders', requireTable, validate(orderSchema), pub.postOrder);
router.get('/orders/:id', requireTable, pub.getOrderStatus);
router.get('/session/orders', requireTable, pub.getSessionOrders);
router.post('/requests', requireTable, validate(requestSchema), pub.postRequest);
router.post('/orders/:id/feedback', requireTable, validate(feedbackSchema), pub.postFeedback);
router.get('/bill/:sessionId', requireTable, pub.getBill);

export default router;
