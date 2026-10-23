import mongoose from 'mongoose';

const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    session: { type: Schema.Types.ObjectId, ref: 'TableSession', index: true },
    orders: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['cash', 'card', 'momo'], required: true },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export const Payment = mongoose.model('Payment', paymentSchema);
