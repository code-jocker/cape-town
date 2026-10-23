import mongoose from 'mongoose';

const { Schema } = mongoose;

const sessionSchema = new Schema(
  {
    table: { type: Schema.Types.ObjectId, ref: 'Table', required: true, index: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
    orders: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
    totalAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid'],
      default: 'unpaid'
    },
    sessionId: { type: String, required: true, unique: true },
    lastActivityAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

sessionSchema.index({ table: 1, status: 1 });

export const TableSession = mongoose.model('TableSession', sessionSchema);
