import { Router } from 'express';
import { z } from 'zod';
import { loginLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as auth from '../controllers/authController.js';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(2).max(80),
  password: z.string().min(4).max(200)
});

router.post('/login', loginLimiter, validate(loginSchema), auth.login);
router.post('/logout', auth.logout);
router.get('/me', requireAuth, auth.me);

export default router;
