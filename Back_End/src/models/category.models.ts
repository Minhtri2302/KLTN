import mongoose from 'mongoose';
import { Category } from '../interface/category.interface.ts';
import { CategorySchema } from '../schema/category.schema.ts';

export const CategoryModel = mongoose.model<Category>('Category', CategorySchema, 'category');
