import mongoose from 'mongoose';

const { Schema } = mongoose;

const promoSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    validFrom: { type: Date, default: Date.now },
    validTo: { type: Date, default: null },
    maxUses: { type: Number, default: 0 },
    used: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Promo = mongoose.model('Promo', promoSchema);
