import path from 'node:path';
import { nanoid } from 'nanoid';
import sharp from 'sharp';
import { config } from '../config/env.js';
import { asyncWrap } from '../utils/asyncWrap.js';
import { invalidateMenuCache } from '../middleware/cache.js';
import { AppError } from '../utils/AppError.js';
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

/** POST /api/upload/image/url — download a remote image URL and store it locally. */
export const downloadImage = asyncWrap(async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return res.status(422).json({ ok: false, error: { code: 'NO_URL', message: 'Provide a valid remote image "url"' } });
  }

  let buffer;
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!resp.ok) throw new Error(`remote returned ${resp.status}`);
    const ct = resp.headers.get('content-type') || '';
    if (!/^image\/(jpe?g|png|webp|gif|avif)$/i.test(ct)) {
      throw new Error('remote url is not an image');
    }
    buffer = Buffer.from(await resp.arrayBuffer());
  } catch (err) {
    throw new AppError('DOWNLOAD_FAILED', `Could not download image: ${err.message}`, 422);
  }

  const dir = path.resolve(process.cwd(), config.uploadDir);
  fs.mkdirSync(dir, { recursive: true });

  const base = nanoid(12);
  const full = `${base}.webp`;
  const thumb = `${base}.thumb.webp`;

  const pipeline = sharp(buffer, { failOn: 'error' }).rotate();
  await pipeline.clone().resize(800, 800, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(dir, full));
  await pipeline.clone().resize(400, 400, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 75 }).toFile(path.join(dir, thumb));

  invalidateMenuCache();
  res.json({
    ok: true,
    data: {
      url: `/uploads/${full}`,
      thumbUrl: `/uploads/${thumb}`
    }
  });
});
