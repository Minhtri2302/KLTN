import { Schema } from 'mongoose';
import { Message } from '../interface/message.interface.ts';

export const MessageSchema = new Schema<Message>({
  userId: { type: String, index: true }, 
  // whether this message has been read by the admin (or recipient)
  read: { type: Boolean, default: false },
  author: { type: String, trim: true },
  authorId: { type: String },
  fromId: { type: String },
  toUserId: { type: String },
  message: { type: String },
  time: { type: String },
  avatar: { type: String },
}, { timestamps: true });
