import { FastifyInstance } from 'fastify';
import { getOnlineUsers, getHistoryByUserId, sendMessageAdmin, sendMessageUser, getChatParticipants, getAdminInfo } from '../controller/message.controller.ts';
import { verifyToken, requireAdmin, requireOwnerOrAdmin, requireUser } from '../middleware/auth.ts';

export default async function chatRoutes(fastify: FastifyInstance) {
  
  fastify.get('/online', { preHandler: [verifyToken, requireAdmin] }, getOnlineUsers);
  fastify.get('/participants', { preHandler: [verifyToken, requireAdmin] }, getChatParticipants);
  fastify.get('/admin-info', { preHandler: [verifyToken] }, getAdminInfo);
  fastify.get<{ Params: { id: string } }>('/history/:id', { preHandler: [verifyToken, requireOwnerOrAdmin] }, getHistoryByUserId);
  fastify.post('/send/admin', { preHandler: [verifyToken, requireAdmin] }, sendMessageAdmin);
  fastify.post('/send/user', { preHandler: [verifyToken, requireUser] }, sendMessageUser);
}
