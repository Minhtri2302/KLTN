import { Category } from '@interfaces/category.interface.ts';
import { Schema } from 'mongoose';

export const CategorySchema = new Schema<Category>({
  name: { type: String, required: true },
  image: { type: String, required: false },
});
