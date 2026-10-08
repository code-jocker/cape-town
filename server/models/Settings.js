import mongoose from 'mongoose';

const { Schema } = mongoose;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const hoursSchema = new Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true },
    label: { type: String, default: '' },
    open: { type: String, default: '10:00' },
    close: { type: String, default: '23:00' },
    closed: { type: Boolean, default: false }
  },
  { _id: false }
);

const settingsSchema = new Schema({
  key: { type: String, unique: true, default: 'main' },
  name: { type: String, default: 'Cape Town K Hotel' },
  tagline: { type: String, default: 'RESTAURANT' },
  location: { type: String, default: 'Kigali-Kimironko' },
  logo: { type: String, default: '/icons/logo.svg' },
  currency: { type: String, default: 'RWF' },
  taxRate: { type: Number, default: 0, min: 0, max: 100 },
  serviceCharge: { type: Number, default: 0, min: 0, max: 100 },
  languages: { type: [String], default: ['en', 'fr', 'rw'] },
  openingHours: { type: [hoursSchema], default: () => DAY_NAMES.map((label, day) => ({ day, label, open: '10:00', close: '23:00', closed: false })) },
  announcement: { type: String, default: '', maxlength: 200 },
  lateThresholds: {
    warnMin: { type: Number, default: 10, min: 1 },
    lateMin: { type: Number, default: 20, min: 2 }
  },
  autoCloseHours: { type: Number, default: 3, min: 1 }
});

settingsSchema.statics.get = async function () {
  let doc = await this.findOne({ key: 'main' }).lean();
  if (!doc) {
    await this.create({ key: 'main' });
    doc = await this.findOne({ key: 'main' }).lean();
  }
  return doc;
};

export const Settings = mongoose.model('Settings', settingsSchema);
