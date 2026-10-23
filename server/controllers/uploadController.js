import path from 'node:path';
import { nanoid } from 'nanoid';
import sharp from 'sharp';
import { config } from '../config/env.js';
import { asyncWrap } from '../utils/asyncWrap.js';
import { invalidateMenuCache } from '../middleware/cache.js';
import fs from 'node:fs';

/** POST /api/upload/image — multipart 'image', re-encoded to WebP via sharp. */
export const uploadImage = asyncWrap(async (req, res) => {
  if (!req.file) {
    return res.status(422).json({ ok: false, error: { code: 'NO_FILE', message: 'Attach an image field named "image"' } });
  }

  const dir = path.resolve(process.cwd(), config.uploadDir);
  fs.mkdirSync(dir, { recursive: true });

  const base = nanoid(12);
  const full = `${base}.webp`;
  const thumb = `${base}.thumb.webp`;

  const pipeline = sharp(req.file.buffer, { failOn: 'error' }).rotate();
  await pipeline.clone().resize(800, 800, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(dir, full));
  await pipeline.clone().resize(400, 400, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 75 }).toFile(path.join(dir, thumb));

  invalidateMenuCache();
  res.status(201).json({
    ok: true,
    data: {
      url: `/uploads/${full}`,
      thumbUrl: `/uploads/${thumb}`
    }
  });
});
