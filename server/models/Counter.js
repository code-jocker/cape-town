import mongoose from 'mongoose';

const { Schema } = mongoose;

const counterSchema = new Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 }
});

export const Counter = mongoose.model('Counter', counterSchema);
