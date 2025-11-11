import { FastifyInstance } from 'fastify';
import {
  createReview,
  getReviewsByProduct,
  getReviewsSummary,
  updateReview,
  deleteReview,
  getAllReviews,
  canUserReviewProduct
} from '../controller/review.controller.ts';
import { verifyToken } from '../middleware/auth.ts';

export default async function reviewRoutes(fastify: FastifyInstance) {

  fastify.post('/', { preHandler: [verifyToken] }as any, createReview );
  fastify.get('/product/:id', getReviewsByProduct );
  fastify.get('/product/:id/summary', getReviewsSummary );
  fastify.get('/product/:id/can-review', { preHandler: [verifyToken] }as any, canUserReviewProduct );
  fastify.get('/', { preHandler: [verifyToken] }as any, getAllReviews );
  fastify.put('/:id', { preHandler: [verifyToken] }as any, updateReview );
  fastify.delete('/:id', { preHandler: [verifyToken] }as any, deleteReview );
}
