import mongoose from 'mongoose';

const { Schema } = mongoose;

const serviceRequestSchema = new Schema(
  {
    table: { type: Schema.Types.ObjectId, ref: 'Table', required: true, index: true },
    session: { type: Schema.Types.ObjectId, ref: 'TableSession' },
    type: { type: String, enum: ['waiter', 'bill', 'water', 'other'], required: true },
    status: { type: String, enum: ['open', 'handled'], default: 'open', index: true },
    handledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

serviceRequestSchema.index({ status: 1, createdAt: -1 });

export const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema);
