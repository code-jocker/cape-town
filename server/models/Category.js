import mongoose from 'mongoose';

const { Schema } = mongoose;

const localized = {
  en: { type: String, required: true, trim: true, maxlength: 120 },
  fr: { type: String, trim: true, maxlength: 120, default: '' },
  rw: { type: String, trim: true, maxlength: 120, default: '' }
};

const categorySchema = new Schema(
  {
    name: { type: localized, required: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

categorySchema.index({ sortOrder: 1 });

export const Category = mongoose.model('Category', categorySchema);
export const localizedSchema = localized;
