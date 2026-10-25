import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadImage, downloadImage } from '../controllers/uploadController.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpe?g|png|webp|gif|avif)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error('ONLY_IMAGES'));
  }
});

router.post('/image', requireAuth, requireRole('manager'), upload.single('image'), uploadImage);
router.post('/image/url', requireAuth, requireRole('manager'), downloadImage);

export default router;
