import { FastifyRequest, FastifyReply } from 'fastify';
import { 
  CreateReviewBody, 
  ReviewByProductParams, 
  UpdateReviewBody 
} from '../interface/review.interface.ts';
import {
  updateReviewService,
  deleteReviewService,
  getAllReviewsService,
  createReviewService,
  getReviewsByProductService,
  getReviewsSummaryService,
  canUserReviewProductService
} from '../service/review.service.ts';

export const updateReview = async (
  req: FastifyRequest<{ Params: { id: string }; Body: Partial<UpdateReviewBody> }> ,
  reply: FastifyReply
) => {
  try {
    const { id } = req.params;
    const updateData = req.body || {};
    const updated = await updateReviewService(id, updateData);
    return reply.send(updated);
  } catch (err) {
    console.error('updateReview', err);
    const message = (err as any)?.message || 'Server error';
    if (message === 'Invalid id' || message.includes('Rating') || message.includes('Status')) {
      return reply.status(400).send({ message });
    }
    if (message === 'Review not found') {
      return reply.status(404).send({ message: 'Not found' });
    }
    return reply.status(500).send({ message: 'Server error' });
  }
};

export const deleteReview = async (
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  try {
    const { id } = req.params as any;
    const deleted = await deleteReviewService(id);
    return reply.send({ message: 'Deleted', id: deleted._id });
  } catch (err) {
    console.error('deleteReview', err);
    const message = (err as any)?.message || 'Server error';
    if (message === 'Invalid id') {
      return reply.status(400).send({ message });
    }
    if (message === 'Review not found') {
      return reply.status(404).send({ message: 'Not found' });
    }
    return reply.status(500).send({ message: 'Server error' });
  }
};

export const getAllReviews = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const list = await getAllReviewsService();
    return reply.send({ data: list });
  } catch (err) {
    console.error('getAllReviews', err);
    return reply.status(500).send({ message: 'Server error' });
  }
};

export const createReview = async (
  req: FastifyRequest<{ Body: CreateReviewBody }>,
  reply: FastifyReply
) => {
  try {
    const { productId, rating, comment } = req.body;
    // Lấy accountId từ token xác thực (id của account)
    const user = (req as any).user;
    const accountId = user && user.id;
    
    const doc = await createReviewService(productId, rating, comment, accountId);
    return reply.status(201).send(doc);
  } catch (err) {
    console.error('createReview', err);
    const message = (err as any)?.message || 'Server error';
    if (
      message === 'Missing fields' || 
      message.includes('Rating') ||
      message.includes('đã đánh giá') ||
      message.includes('chỉ có thể đánh giá')
    ) {
      return reply.status(400).send({ message });
    }
    if (message === 'Missing accountId from token') {
      return reply.status(401).send({ message });
    }
    if (message === 'User profile not found') {
      return reply.status(404).send({ message });
    }
    return reply.status(500).send({ message: 'Server error' });
  }
};

export const getReviewsByProduct = async (
  req: FastifyRequest<{ Params: ReviewByProductParams }>,
  reply: FastifyReply
) => {
  try {
    const { id } = req.params;
    const list = await getReviewsByProductService(id);
    return reply.send({ data: list });
  } catch (err) {
    console.error('getReviewsByProduct', err);
    const message = (err as any)?.message || 'Server error';
    if (message === 'Missing product id') {
      return reply.status(400).send({ message });
    }
    return reply.status(500).send({ message: 'Server error' });
  }
};

export const getReviewsSummary = async (
  req: FastifyRequest<{ Params: ReviewByProductParams }>,
  reply: FastifyReply
) => {
  try {
    const { id } = req.params;
    const summary = await getReviewsSummaryService(id);
    return reply.send(summary);
  } catch (err) {
    console.error('getReviewsSummary', err);
    const message = (err as any)?.message || 'Server error';
    if (message === 'Missing product id') {
      return reply.status(400).send({ message });
    }
    return reply.status(500).send({ message: 'Server error' });
  }
};

export const canUserReviewProduct = async (
  req: FastifyRequest<{ Params: ReviewByProductParams }>,
  reply: FastifyReply
) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const accountId = user && user.id;

    if (!accountId) {
      return reply.status(401).send({ canReview: false, reason: 'Unauthorized' });
    }

    const result = await canUserReviewProductService(id, accountId);
    return reply.send(result);
  } catch (err) {
    console.error('canUserReviewProduct', err);
    return reply.status(500).send({ canReview: false, reason: 'Server error' });
  }
};
