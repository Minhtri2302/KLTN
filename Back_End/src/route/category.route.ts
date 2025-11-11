import { FastifyInstance } from 'fastify';
import {
  getAllCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controller/category.controller.ts';
import { verifyToken, requireAdmin } from '../middleware/auth.ts';

export default async function categoryRoutes(fastify: FastifyInstance) {
  fastify.get('/', getAllCategory);
  fastify.post('/', { preHandler: [verifyToken , requireAdmin ] }, createCategory);
  fastify.put('/:id', { preHandler: [verifyToken , requireAdmin ] }as any, updateCategory);
  fastify.delete('/:id', { preHandler: [verifyToken , requireAdmin ] }as any, deleteCategory);
}
