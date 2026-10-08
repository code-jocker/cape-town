import mongoose from 'mongoose';

const { Schema } = mongoose;

export const ORDER_STATUSES = [
  'pending',
  'accepted',
  'preparing',
  'ready',
  'served',
  'paid',
  'cancelled'
];

export const ACTIVE_STATUSES = ['pending', 'accepted', 'preparing', 'ready'];

/** Allowed status transitions (lifecycle enforced server-side). */
export const TRANSITIONS = {
  pending: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served'],
  served: ['paid'],
  paid: [],
  cancelled: []
};

const itemSnapshotSchema = new Schema(
  {
    menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
    nameSnapshot: {
      en: String,
      fr: String,
      rw: String
    },
    priceSnapshot: { type: Number, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 50 },
    selectedOptions: [
      {
        name: { type: String, required: true },
        choices: [
          {
            label: { type: String, required: true },
            extraPrice: { type: Number, default: 0, min: 0 }
          }
        ]
      }
    ],
    note: { type: String, maxlength: 200, default: '' },
    station: { type: String, enum: ['kitchen', 'bar', 'dessert'], default: 'kitchen' }
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    table: { type: Schema.Types.ObjectId, ref: 'Table', required: true, index: true },
    session: { type: Schema.Types.ObjectId, ref: 'TableSession', required: true, index: true },
    items: { type: [itemSnapshotSchema], required: true, validate: (v) => v.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    promoCode: { type: String, default: '' },
    tax: { type: Number, default: 0, min: 0 },
    serviceCharge: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'pending',
      index: true
    },
    cancelReason: { type: String, maxlength: 300, default: '' },
    statusHistory: [
      {
        status: { type: String, required: true },
        at: { type: Date, default: Date.now },
        by: { type: String, default: 'customer' },
        byRole: { type: String, default: 'customer' }
      }
    ],
    notes: { type: String, maxlength: 300, default: '' },
    paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
    paymentMethod: { type: String, enum: ['cash', 'card', 'momo', ''], default: '' },
    idempotencyKey: { type: String, unique: true, sparse: true },
    feedback: {
      rating: { type: Number, min: 1, max: 5, default: null },
      comment: { type: String, maxlength: 500, default: '' },
      createdAt: { type: Date, default: null }
    }
  },
  { timestamps: true }
);

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ table: 1, status: 1 });
orderSchema.index({ session: 1, createdAt: 1 });
orderSchema.index({ createdAt: -1 });

export const Order = mongoose.model('Order', orderSchema);
