import { Schema, Types } from 'mongoose';

export const ReviewSchema = new Schema({
  productId: { type: Types.ObjectId, ref: "Product", required: true },
  userId: { type: Types.ObjectId, ref: 'User' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});
