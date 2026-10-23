import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as requests from '../controllers/requestController.js';

const router = Router();

router.use(requireAuth);

router.get('/', requests.listRequests);
router.patch('/:id/handle', requireRole('waiter', 'manager', 'chef'), requests.handleRequest);

export default router;
