import mongoose from 'mongoose';
import { ReviewSchema } from '../schema/review.schema.ts';
import { Review } from '../interface/review.interface.ts';

export const ReviewModel = mongoose.model<Review>('Review', ReviewSchema, 'reviews');
