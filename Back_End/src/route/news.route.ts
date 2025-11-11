import { FastifyInstance } from 'fastify';
import { verifyToken, requireAdmin } from '../middleware/auth.ts';
import { 
  CreateNewsBody, 
  UpdateNewsBody, 
  NewsByIdParams, 
  GetNewsQuery,
  NewsViewQuery
} from '../interface/news.interface.ts';
import {
  getNews,
  getAllNewsAdmin,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
  getHomeTopNews,
} from '../controller/news.controller.ts';

export default async function newsRoute(fastify: FastifyInstance) {
  // Public routes
  fastify.get<{ Querystring: GetNewsQuery }>(
    '/', 
    getNews
  );

  fastify.get(
    '/home-top', 
    getHomeTopNews
  );

  fastify.get<{ Params: NewsByIdParams; Querystring: NewsViewQuery }>(
    '/:id', 
    getNewsById
  );

  // Admin routes
  fastify.get<{ Querystring: GetNewsQuery }>(
    '/admin/all',
    { preHandler: [verifyToken, requireAdmin] },
    getAllNewsAdmin
  );

  fastify.post<{ Body: CreateNewsBody }>(
    '/post', 
    { preHandler: [verifyToken, requireAdmin] }, 
    createNews
  );

  fastify.put<{ Params: NewsByIdParams; Body: UpdateNewsBody }>(
    '/:id/update', 
    { preHandler: [verifyToken, requireAdmin] }, 
    updateNews
  );

  fastify.delete<{ Params: NewsByIdParams }>(
    '/:id/delete', 
    { preHandler: [verifyToken, requireAdmin] }, 
    deleteNews
  );
}
