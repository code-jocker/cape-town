import mongoose from 'mongoose';
import { localizedSchema } from './Category.js';

const { Schema } = mongoose;

const optionChoiceSchema = new Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 80 },
    extraPrice: { type: Number, default: 0, min: 0 }
  },
  { _id: false }
);

const optionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    required: { type: Boolean, default: false },
    multiple: { type: Boolean, default: false },
    choices: { type: [optionChoiceSchema], default: [] }
  },
  { _id: false }
);

const menuItemSchema = new Schema(
  {
    name: { type: localizedSchema, required: true },
    description: {
      en: { type: String, trim: true, maxlength: 500, default: '' },
      fr: { type: String, trim: true, maxlength: 500, default: '' },
      rw: { type: String, trim: true, maxlength: 500, default: '' }
    },
    price: { type: Number, required: true, min: 0 },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    image: { url: { type: String, default: '' }, thumbUrl: { type: String, default: '' } },
    tags: {
      type: [String],
      enum: ['vegetarian', 'spicy', 'popular', 'new'],
      default: []
    },
    allergens: { type: [String], default: [] },
    station: { type: String, enum: ['kitchen', 'bar', 'dessert'], default: 'kitchen' },
    options: { type: [optionSchema], default: [] },
    isAvailable: { type: Boolean, default: true },
    availableFrom: { type: String, default: '' },
    availableTo: { type: String, default: '' },
    prepTimeMinutes: { type: Number, default: 10, min: 0, max: 180 },
    sortOrder: { type: Number, default: 0 },
    trackStock: { type: Boolean, default: false },
    stockQty: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 3, min: 0 }
  },
  { timestamps: true }
);

menuItemSchema.index({ category: 1, isAvailable: 1, sortOrder: 1 });

export const MenuItem = mongoose.model('MenuItem', menuItemSchema);
