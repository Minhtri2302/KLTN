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
import { CreateReviewBody, ReviewByProductParams, UpdateReviewBody } from '../interface/review.interface.ts';

export default async function reviewRoutes(fastify: FastifyInstance) {

  fastify.post<{ Body: CreateReviewBody }>('/', { preHandler: [verifyToken] }, createReview );
  fastify.get<{ Params: ReviewByProductParams }>('/product/:id', getReviewsByProduct );
  fastify.get<{ Params: ReviewByProductParams }>('/product/:id/summary', getReviewsSummary );
  fastify.get<{ Params: ReviewByProductParams }>('/product/:id/can-review', { preHandler: [verifyToken] }, canUserReviewProduct );
  fastify.get('/', { preHandler: [verifyToken] }, getAllReviews );
  fastify.put<{ Params: { id: string }; Body: Partial<UpdateReviewBody> }>('/:id', { preHandler: [verifyToken] }, updateReview );
  fastify.delete<{ Params: { id: string } }>('/:id', { preHandler: [verifyToken] }, deleteReview );
}
