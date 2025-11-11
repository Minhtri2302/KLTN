import { Schema } from 'mongoose';

export const NewsSchema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  image: { type: String },
  author: { type: String },
  publishedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  tags: [{ type: String }],
  views: { type: Number, default: 0 }, // số lượt xem
  viewedBy: [{ type: String }], // danh sách userId hoặc IP đã xem
});
