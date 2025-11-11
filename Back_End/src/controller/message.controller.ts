import { FastifyReply, FastifyRequest } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import { EnrichedUser } from '../interface/socket.interface.ts';
import { messageService } from '../service/message.service.ts';

// ===========================
// 📡 CONTROLLERS
// ===========================

export const getOnlineUsers = async (req: FastifyRequest, reply: FastifyReply) => {
  const io = (req.server as unknown as { io?: SocketIOServer }).io;
  if (!io) return reply.status(500).send({ message: 'Socket.IO not initialized' });

  const users = await messageService.getOnlineUsers(io);
  return reply.send(users);
};

export const getAdminInfo = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const result = await messageService.getAdminInfo();
    return reply.send(result);
  } catch (err: any) {
    console.error('getAdminInfo error', err);
    if (err.status) {
      return reply.status(err.status).send({ message: err.message });
    }
    return reply.status(500).send({ message: 'Server error' });
  }
};

export const getChatParticipants = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const io = (req.server as unknown as { io?: SocketIOServer }).io;
    const result = await messageService.getChatParticipants(io);
    return reply.send(result);
  } catch (err) {
    console.error('getChatParticipants error', err);
    return reply.status(500).send({ message: 'Server error' });
  }
};

export const getHistoryByUserId = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = ((req.params as unknown) as { id?: string })?.id;
    if (!userId) return reply.status(400).send({ message: 'Missing user id' });

    const io = (req.server as unknown as { io?: SocketIOServer }).io;
    const requester = ((req as unknown) as { user?: EnrichedUser }).user;
    
    const enrichedMessages = await messageService.getHistoryByUserId(
      userId,
      requester?.role,
      io
    );

    return reply.send(enrichedMessages);
  } catch (err) {
    console.error('getHistoryByUserId error', err);
    return reply.status(500).send({ message: 'Server error' });
  }
};

// ===========================
// 💬 SEND MESSAGE CONTROLLERS
// ===========================

// ADMIN → USER
export const sendMessageAdmin = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const io = (req.server as unknown as { io?: SocketIOServer }).io as SocketIOServer | undefined;
    const body = (req.body as unknown) as Partial<{ toUserId?: string; message?: string }>;
    const authUser = ((req as unknown) as { user?: EnrichedUser }).user;
    if (!authUser || authUser.role !== 'admin') return reply.status(403).send({ message: 'Only admin allowed' });

    const toUserId = body.toUserId?.trim();
    const messageText = body.message?.trim();
    if (!toUserId) return reply.status(400).send({ message: 'Missing toUserId' });
    if (!messageText) return reply.status(400).send({ message: 'Missing message' });

    const payload = await messageService.sendMessageAdmin(toUserId, messageText, authUser, io);
    return reply.send(payload);
  } catch (err) {
    console.error('sendMessageAdmin error', err);
    return reply.status(500).send({ message: 'Server error' });
  }
};

// USER → ADMIN
export const sendMessageUser = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const io = (req.server as unknown as { io?: SocketIOServer }).io as SocketIOServer | undefined;
    const body = (req.body as unknown) as Partial<{ message?: string }>;
    const authUser = ((req as unknown) as { user?: EnrichedUser }).user;
    if (!authUser || authUser.role !== 'user') return reply.status(403).send({ message: 'Only user allowed' });

    const messageText = body.message?.trim();
    if (!messageText) return reply.status(400).send({ message: 'Missing message' });

    const payload = await messageService.sendMessageUser(messageText, authUser, io);
    return reply.send(payload);
  } catch (err) {
    console.error('sendMessageUser error', err);
    return reply.status(500).send({ message: 'Server error' });
  }
};