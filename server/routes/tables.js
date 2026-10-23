import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as tables from '../controllers/tableController.js';

const router = Router();

const tableSchema = z.object({
  number: z.number().int().min(1).max(1000),
  label: z.string().max(60).optional().default(''),
  capacity: z.number().int().min(1).max(50).optional(),
  isActive: z.boolean().optional()
});

router.use(requireAuth, requireRole('manager'));

router.get('/', tables.listTables);
router.post('/', validate(tableSchema), tables.createTable);
router.get('/qr-sheet.pdf', tables.qrSheet);
router.get('/:id/qr.png', tables.qrPngRoute);
router.post('/:id/regenerate-token', tables.regenerateToken);
router.patch('/:id', validate(tableSchema.partial()), tables.updateTable);
router.delete('/:id', tables.deleteTable);

export default router;
