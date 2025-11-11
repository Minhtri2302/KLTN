import mongoose from 'mongoose';
import { News } from '../interface/news.interface.ts';
import { NewsSchema } from '../schema/news.schema.ts';

export const NewsModel = mongoose.model<News>('News', NewsSchema, 'news');
