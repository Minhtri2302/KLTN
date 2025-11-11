import { CategoryModel } from '../models/category.models.ts';
import cloudinary from '../config/cloudinary.ts';
import { 
  Category, 
  CreateCategoryBody, 
  UpdateCategoryBody 
} from '../interface/category.interface.ts';

export class CategoryService {
  async getAllCategories(): Promise<Category[]> {
    const categories = await CategoryModel.find({}, '_id name image').lean();
    return categories;
  }

  async uploadImage(stream: any): Promise<string> {
    const result: any = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'kltn_categories' },
        (error: any, res: any) => {
          if (error) return reject(error);
          return resolve(res);
        }
      );
      stream.pipe(uploadStream).on('error', (err: any) => reject(err));
    });

    if (!result || !result.secure_url) {
      throw { status: 500, message: 'Image upload failed' };
    }

    return result.secure_url;
  }

  async createCategory(name: string, imageUrl?: string): Promise<Category> {
    if (!name) {
      throw { status: 400, message: 'Name is required' };
    }

    const toCreate: CreateCategoryBody = { name };
    if (imageUrl) toCreate.image = imageUrl;

    const category = await CategoryModel.create(toCreate);
    return category;
  }

  async updateCategory(id: string, name?: string, imageUrl?: string): Promise<Category> {
    if (!id) {
      throw { status: 400, message: 'ID is required' };
    }

    const update: UpdateCategoryBody = {};
    if (name) update.name = name;
    if (imageUrl) update.image = imageUrl;

    if (Object.keys(update).length === 0) {
      throw { status: 400, message: 'Nothing to update' };
    }

    const category = await CategoryModel.findByIdAndUpdate(id, update, { new: true });
    if (!category) {
      throw { status: 404, message: 'Category not found' };
    }

    return category;
  }

  async deleteCategory(id: string): Promise<{ message: string; category: Category }> {
    if (!id) {
      throw { status: 400, message: 'ID is required' };
    }

    const category = await CategoryModel.findByIdAndDelete(id);
    if (!category) {
      throw { status: 404, message: 'Category not found' };
    }

    return { message: 'Category deleted successfully', category };
  }
}

export const categoryService = new CategoryService();
