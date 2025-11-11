import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateNewsBody, UpdateNewsBody, NewsByIdParams, GetNewsQuery, NewsViewQuery } from '../interface/news.interface.ts';
import { newsService } from '../service/news.service.ts';

class NewsController {
  async getHomeTopNews(req: FastifyRequest, reply: FastifyReply) {
    try {
      const news = await newsService.getHomeTopNews();
      return reply.status(200).send({ 
        success: true,
        data: news 
      });
    } catch (error: any) {
      console.error('getHomeTopNews error:', error);
      return reply.status(500).send({ 
        success: false,
        message: 'Internal Server Error' 
      });
    }
  }

  async getNews(req: FastifyRequest<{ Querystring: GetNewsQuery }>, reply: FastifyReply) {
    try {
      const { search } = req.query;
      const result = await newsService.getNews(search);
      return reply.status(200).send({ 
        success: true,
        ...result 
      });
    } catch (error: any) {
      console.error('getNews error:', error);
      return reply.status(500).send({ 
        success: false,
        message: 'Internal Server Error' 
      });
    }
  }

  async getAllNewsAdmin(req: FastifyRequest<{ Querystring: GetNewsQuery }>, reply: FastifyReply) {
    try {
      const { search } = req.query;
      const result = await newsService.getAllNewsAdmin(search);
      return reply.status(200).send({ 
        success: true,
        ...result 
      });
    } catch (error: any) {
      console.error('getAllNewsAdmin error:', error);
      return reply.status(500).send({ 
        success: false,
        message: 'Internal Server Error' 
      });
    }
  }

  async getNewsById(req: FastifyRequest<{ Params: NewsByIdParams; Querystring: NewsViewQuery }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const { userId } = req.query;
      
      // Lấy userId từ token nếu có
      let viewerId = userId;
      if (!viewerId && (req as any).user?.userId) {
        viewerId = (req as any).user.userId;
      }
      
      const news = await newsService.getNewsById(id, viewerId);
      return reply.status(200).send({ 
        success: true,
        data: news 
      });
    } catch (error: any) {
      console.error('getNewsById error:', error);
      const status = error.status || 500;
      const message = error.message || 'Internal Server Error';
      return reply.status(status).send({ 
        success: false,
        message 
      });
    }
  }

  async createNews(req: FastifyRequest<{ Body: CreateNewsBody }>, reply: FastifyReply) {
    try {
      const news = await newsService.createNews(req.body);
      return reply.status(201).send({ 
        success: true,
        message: 'News created successfully',
        data: news 
      });
    } catch (error: any) {
      console.error('createNews error:', error);
      const status = error.status || 500;
      const message = error.message || 'Internal Server Error';
      return reply.status(status).send({ 
        success: false,
        message 
      });
    }
  }

  async updateNews(req: FastifyRequest<{ Params: NewsByIdParams; Body: UpdateNewsBody }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const news = await newsService.updateNews(id, req.body);
      return reply.status(200).send({ 
        success: true,
        message: 'News updated successfully',
        data: news 
      });
    } catch (error: any) {
      console.error('updateNews error:', error);
      const status = error.status || 500;
      const message = error.message || 'Internal Server Error';
      return reply.status(status).send({ 
        success: false,
        message 
      });
    }
  }

  async deleteNews(req: FastifyRequest<{ Params: NewsByIdParams }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const result = await newsService.deleteNews(id);
      return reply.status(200).send({ 
        success: true,
        message: result.message,
        data: result.data 
      });
    } catch (error: any) {
      console.error('deleteNews error:', error);
      const status = error.status || 500;
      const message = error.message || 'Internal Server Error';
      return reply.status(status).send({ 
        success: false,
        message 
      });
    }
  }
}

export const newsController = new NewsController();

// Export individual methods for route handlers
export const getHomeTopNews = newsController.getHomeTopNews.bind(newsController);
export const getNews = newsController.getNews.bind(newsController);
export const getAllNewsAdmin = newsController.getAllNewsAdmin.bind(newsController);
export const getNewsById = newsController.getNewsById.bind(newsController);
export const createNews = newsController.createNews.bind(newsController);
export const updateNews = newsController.updateNews.bind(newsController);
export const deleteNews = newsController.deleteNews.bind(newsController);
