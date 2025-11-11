import { FastifyInstance } from 'fastify';
import { getOnlineUsers, getHistoryByUserId, sendMessageAdmin, sendMessageUser, getChatParticipants, getAdminInfo } from '../controller/message.controller.ts';
import { verifyToken, requireAdmin, requireOwnerOrAdmin, requireUser } from '../middleware/auth.ts';

export default async function chatRoutes(fastify: FastifyInstance) {
  
  fastify.get('/online', { preHandler: [verifyToken, requireAdmin] } as any, getOnlineUsers);
  fastify.get('/participants', { preHandler: [verifyToken, requireAdmin] } as any, getChatParticipants);
  fastify.get('/admin-info', { preHandler: [verifyToken] } as any, getAdminInfo);
  fastify.get('/history/:id', { preHandler: [verifyToken, requireOwnerOrAdmin] } as any, getHistoryByUserId);
  fastify.post('/send/admin', { preHandler: [verifyToken, requireAdmin] } as any, sendMessageAdmin);
  fastify.post('/send/user', { preHandler: [verifyToken, requireUser] } as any, sendMessageUser);
}
