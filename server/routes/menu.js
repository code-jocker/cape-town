import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as menu from '../controllers/menuController.js';

const router = Router();

const localizedSchema = z.object({
  en: z.string().min(1).max(120),
  fr: z.string().max(120).optional().default(''),
  rw: z.string().max(120).optional().default('')
});

const choiceSchema = z.object({
  label: z.string().min(1).max(80),
  extraPrice: z.number().min(0).max(1_000_000).default(0)
});

const optionSchema = z.object({
  name: z.string().min(1).max(80),
  required: z.boolean().default(false),
  multiple: z.boolean().default(false),
  choices: z.array(choiceSchema).max(10).default([])
});

const timeHM = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'must be HH:MM')
  .or(z.literal(''));

const categorySchema = z.object({
  name: localizedSchema,
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional()
});

const itemSchema = z.object({
  name: localizedSchema,
  description: z
    .object({
      en: z.string().max(500).optional().default(''),
      fr: z.string().max(500).optional().default(''),
      rw: z.string().max(500).optional().default('')
    })
    .optional(),
  price: z.number().min(0).max(10_000_000),
  category: z.string().min(1),
  image: z.object({ url: z.string().max(300).default(''), thumbUrl: z.string().max(300).default('') }).optional(),
  tags: z.array(z.enum(['vegetarian', 'spicy', 'popular', 'new'])).max(4).optional(),
  allergens: z.array(z.string().max(40)).max(10).optional(),
  station: z.enum(['kitchen', 'bar', 'dessert']).optional(),
  options: z.array(optionSchema).max(6).optional(),
  isAvailable: z.boolean().optional(),
  availableFrom: timeHM.optional(),
  availableTo: timeHM.optional(),
  prepTimeMinutes: z.number().int().min(0).max(180).optional(),
  sortOrder: z.number().int().min(0).optional(),
  trackStock: z.boolean().optional(),
  stockQty: z.number().int().min(0).max(100000).optional(),
  lowStockThreshold: z.number().int().min(0).max(1000).optional()
});

const availabilitySchema = z.object({ isAvailable: z.boolean() });
const reorderSchema = z.object({
  type: z.enum(['categories', 'items']),
  ids: z.array(z.string().min(1)).min(1).max(200)
});

// Staff-visible menu data
router.get('/items', requireAuth, menu.listItems);
router.get('/categories', requireAuth, menu.listCategories);

// Manager CRUD
router.post('/categories', requireAuth, requireRole('manager'), validate(categorySchema), menu.createCategory);
router.patch('/categories/:id', requireAuth, requireRole('manager'), validate(categorySchema.partial()), menu.updateCategory);
router.delete('/categories/:id', requireAuth, requireRole('manager'), menu.deleteCategory);

router.post('/items', requireAuth, requireRole('manager'), validate(itemSchema), menu.createItem);
router.patch('/items/:id', requireAuth, requireRole('manager'), validate(itemSchema.partial()), menu.updateItem);
router.delete('/items/:id', requireAuth, requireRole('manager'), menu.deleteItem);
router.post('/reorder', requireAuth, requireRole('manager'), validate(reorderSchema), menu.reorder);

// Chef + manager: live availability toggle
router.patch(
  '/items/:id/availability',
  requireAuth,
  requireRole('chef', 'manager'),
  validate(availabilitySchema),
  menu.patchAvailability
);

export default router;
