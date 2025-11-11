import mongoose from 'mongoose';
import { MessageSchema } from '../schema/massage.schema.ts';
import { Message } from '../interface/message.interface.ts';

export const MessageModel = mongoose.model<Message>('Message', MessageSchema, 'messages');
