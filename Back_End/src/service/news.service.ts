import { NewsModel } from '../models/news.model.ts';
import { News, CreateNewsBody, UpdateNewsBody } from '../interface/news.interface.ts';
import mongoose from 'mongoose';

class NewsService {
  async getHomeTopNews(): Promise<News[]> {
    try {
      const news = await NewsModel.find({ status: 'active' })
        .sort({ publishedAt: -1 })
        .limit(3);
      return news;
    } catch (error) {
      throw error;
    }
  }

  async getNews(search?: string): Promise<{ data: News[]; total: number }> {
    try {
      const filter: any = { status: 'active' };
      if (search && search.trim()) {
        filter.title = { $regex: `.*${search.trim()}.*`, $options: 'i' };
      }
      const news = await NewsModel.find(filter).sort({ publishedAt: -1 });
      return { data: news, total: news.length };
    } catch (error) {
      throw error;
    }
  }

  async getAllNewsAdmin(search?: string): Promise<{ data: News[]; total: number }> {
    try {
      const filter: any = {};
      if (search && search.trim()) {
        filter.title = { $regex: `.*${search.trim()}.*`, $options: 'i' };
      }
      const news = await NewsModel.find(filter).sort({ publishedAt: -1 });
      return { data: news, total: news.length };
    } catch (error) {
      throw error;
    }
  }

  async getNewsById(id: string, userId?: string): Promise<News> {
    try {
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw { status: 400, message: 'Invalid news ID' };
      }
      
      const item = await NewsModel.findById(id);
      
      if (!item) {
        throw { status: 404, message: 'News not found' };
      }

      // Kiểm tra userId hoặc sử dụng 'anonymous' nếu không có
      const viewerId = userId || 'anonymous';
      
      // Chỉ tăng views nếu userId/IP chưa xem bài này
      if (!item.viewedBy || !item.viewedBy.includes(viewerId)) {
        await NewsModel.findByIdAndUpdate(
          id,
          { 
            $inc: { views: 1 },
            $addToSet: { viewedBy: viewerId } // Thêm userId vào danh sách đã xem (không trùng)
          }
        );
        item.views = (item.views || 0) + 1;
      }
      
      return item;
    } catch (error) {
      throw error;
    }
  }

  async createNews(data: CreateNewsBody): Promise<News> {
    try {
      const { title, content, image, author, tags, status } = data;
      
      if (!title || typeof title !== 'string' || !title.trim()) {
        throw { status: 400, message: 'Title is required' };
      }
      
      if (!content || typeof content !== 'string') {
        throw { status: 400, message: 'Content is required' };
      }
      
      const newsData: any = {
        title: title.trim(),
        content,
        status: status || 'active',
      };
      
      if (image) newsData.image = image;
      if (author) newsData.author = author;
      if (tags && tags.length > 0) newsData.tags = tags;
      
      const created = await NewsModel.create(newsData);
      return created;
    } catch (error) {
      throw error;
    }
  }

  async updateNews(id: string, data: UpdateNewsBody): Promise<News> {
    try {
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw { status: 400, message: 'Invalid news ID' };
      }

      const updateData: any = {};
      
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.image !== undefined) updateData.image = data.image;
      if (data.author !== undefined) updateData.author = data.author;
      if (data.tags !== undefined) updateData.tags = data.tags;
      if (data.publishedAt !== undefined) updateData.publishedAt = data.publishedAt;
      
      if (data.status !== undefined) {
        const allowedStatuses = ['active', 'inactive'];
        if (!allowedStatuses.includes(data.status)) {
          throw { status: 400, message: 'Invalid status. Allowed: active, inactive' };
        }
        updateData.status = data.status;
      }

      const updated = await NewsModel.findByIdAndUpdate(
        id, 
        updateData, 
        { new: true, runValidators: true }
      );
      
      if (!updated) {
        throw { status: 404, message: 'News not found' };
      }
      
      return updated;
    } catch (error) {
      throw error;
    }
  }

  async deleteNews(id: string): Promise<{ message: string; data: News }> {
    try {
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw { status: 400, message: 'Invalid news ID' };
      }
      
      const deleted = await NewsModel.findByIdAndDelete(id);
      
      if (!deleted) {
        throw { status: 404, message: 'News not found' };
      }
      
      return { message: 'News deleted successfully', data: deleted };
    } catch (error) {
      throw error;
    }
  }
}

export const newsService = new NewsService();
