import mongoose from 'mongoose';

const { Schema } = mongoose;

const tableSchema = new Schema(
  {
    number: { type: Number, required: true, unique: true, min: 1 },
    label: { type: String, trim: true, maxlength: 60, default: '' },
    capacity: { type: Number, default: 4, min: 1, max: 50 },
    isActive: { type: Boolean, default: true },
    qrToken: { type: String, required: true },
    tokenVersion: { type: Number, default: 0 }
  },
  { timestamps: true }
);

tableSchema.index({ isActive: 1 });

export const Table = mongoose.model('Table', tableSchema);
