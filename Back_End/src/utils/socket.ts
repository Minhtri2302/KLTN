import { FastifyInstance } from 'fastify';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { AuthSocket,  EnrichedUser, MyJwtPayload } from '../interface/socket.interface.ts';
import { MessageModel } from '../models/message.model.ts';
import { UserModel } from '../models/user.model.ts';

//REGISTER SOCKET 
export function registerSocket(fastify: FastifyInstance) {
  const io = new SocketIOServer(fastify.server, {
    cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] },
  });

  (fastify as any).io = io;
  const secret = process.env.JWT_SECRET || 'changeme';
  const onlineUsers = new Set<string>();
  const onlineAdmins = new Set<string>();

  //  AUTH
  io.use((socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) return next(new Error('No token'));
      const payload = jwt.verify(token, secret) as MyJwtPayload;
      (socket as AuthSocket).data = { 
        user: payload as EnrichedUser, 
        viewingUserId: null,
        chatWindowOpen: false 
      };
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  //  ON CONNECTION 
  io.on('connection', async (socket: AuthSocket) => {
    const user = socket.data.user;

    // 🎯 Lấy profile user từ DB và enrich avatar đầy đủ
    try {
      const profile = await UserModel.findOne({ accountId: String(user.id) }).lean();
      if (profile) {
        socket.data.user = { 
          ...user, 
          profile,
          // ✅ Đảm bảo avatar luôn có sẵn ở top-level
          avatar: profile.avatar || user.avatar || user.avatarUrl,
        };
      }
    } catch (err) {
      fastify.log.error(err, 'Failed to enrich user profile');
    }

    // ADMIN CONNECTED
    if (user.role === 'admin') {
      socket.join('admins');
      onlineAdmins.add(user.id);
      
      // ✅ Lấy avatar đồng nhất
      const avatar = socket.data.user.avatar || socket.data.user.profile?.avatar || socket.data.user.avatarUrl;

      io.emit('admin_online', { adminId: user.id, name: user.name, avatar });
      socket.emit('current_online_users', Array.from(onlineUsers).map(id => ({ userId: id })));
    }

    // USER CONNECTED
    if (user.role === 'user') {
      const room = `user_${user.id}`;
      socket.join(room);
      onlineUsers.add(user.id);

      // Gửi lịch sử tin nhắn
      const history = await MessageModel.find({ userId: user.id }).sort({ createdAt: 1 }).lean();
      socket.emit('history', history);

      // ✅ Lấy avatar đồng nhất
      const avatar = socket.data.user.avatar || socket.data.user.profile?.avatar || socket.data.user.avatarUrl;
      io.to('admins').emit('user_online', { userId: user.id, name: user.name, avatar });

      socket.emit(
        onlineAdmins.size > 0 ? 'admin_online' : 'admin_offline',
        { adminCount: onlineAdmins.size }
      );
    }

    //  USER CHAT WINDOW STATUS (MỞ/ĐÓNG)
    socket.on('chat_window_status', (data: { isOpen: boolean }) => {
      if (user.role !== 'user') return;
      socket.data.chatWindowOpen = data.isOpen;
      console.log(`💬 User ${user.id} chat window: ${data.isOpen ? 'OPEN' : 'CLOSED'}`);
    });

    //  USER MỞ CHAT → MARK ĐÃ ĐỌC
    socket.on('user_opened_chat', async () => {
      if (user.role !== 'user') return;
      const userId = user.id;

      const unread = await MessageModel.find({
        userId,
        fromId: { $ne: userId },
        read: { $ne: true },
      }).select('_id');

      if (!unread.length) return;
      const ids = unread.map(m => String(m._id));
      const readAt = new Date();

      await MessageModel.updateMany({ _id: { $in: ids } }, { $set: { read: true, readAt } });
      io.to(`user_${userId}`).emit('messages_marked_read', { userId, messageIds: ids, readAt });
      io.to('admins').emit('messages_marked_read', { userId, messageIds: ids, readAt });
      io.to('admins').emit('participant_updated', { id: userId, unreadCount: 0 });
    });


    // ADMIN XEM CHAT NÀO
    socket.on('admin_viewing_chat', (data: { userId: string | null }) => {
      if (user.role !== 'admin') return;
      const prev = socket.data.viewingUserId;
      const next = data.userId;

      if (prev && prev !== next)
        io.to(`user_${prev}`).emit('admin_closed_chat', { adminId: user.id });

      if (next && next !== prev)
        io.to(`user_${next}`).emit('admin_opened_chat', { adminId: user.id });

      socket.data.viewingUserId = next;
    });

    //  ADMIN → USER
    socket.on('send_message_admin', async (data: { toUserId: string; text: string }) => {
      if (user.role !== 'admin') return;
      const { toUserId, text } = data;

      const msg = await MessageModel.create({
        userId: toUserId,
        fromId: user.id,
        toId: toUserId,
        text,
        createdAt: new Date(),
        read: false,
      });

      io.to(`user_${toUserId}`).emit('new_message', msg);
      io.to('admins').emit('new_message', msg);

      //  Nếu user đang mở chat window → tự mark read
      let isUserViewing = false;
      for (const s of io.sockets.sockets.values()) {
        const u = (s as AuthSocket).data?.user;
        const chatOpen = (s as AuthSocket).data?.chatWindowOpen;
        if (u?.role === 'user' && u.id === toUserId && chatOpen === true) {
          isUserViewing = true;
          break;
        }
      }

      if (isUserViewing) {
        const readAt = new Date();
        await MessageModel.updateOne({ _id: msg._id }, { $set: { read: true, readAt } });
        io.to(`user_${toUserId}`).emit('messages_marked_read', {
          userId: toUserId,
          messageIds: [String(msg._id)],
          readAt,
        });
        io.to('admins').emit('messages_marked_read', {
          userId: toUserId,
          messageIds: [String(msg._id)],
          readAt,
        });
      }
    });

    //  USER → ADMIN
    socket.on('send_message_user', async (data: { text: string }) => {
      if (user.role !== 'user') return;
      const { text } = data;
      const toAdmins = Array.from(onlineAdmins);

      const msg = await MessageModel.create({
        userId: user.id,
        fromId: user.id,
        toId: null,
        text,
        createdAt: new Date(),
        read: false,
      });

      io.to('admins').emit('new_message', msg);
      io.to(`user_${user.id}`).emit('new_message', msg);

      // Nếu admin đang mở chat user này → mark read
      let isAdminViewing = false;
      for (const s of io.sockets.sockets.values()) {
        const a = (s as AuthSocket).data?.user;
        const viewing = (s as AuthSocket).data?.viewingUserId;
        if (a?.role === 'admin' && viewing === user.id) {
          isAdminViewing = true;
          break;
        }
      }

      if (isAdminViewing) {
        const readAt = new Date();
        await MessageModel.updateOne({ _id: msg._id }, { $set: { read: true, readAt } });
        io.to(`user_${user.id}`).emit('messages_marked_read', {
          userId: user.id,
          messageIds: [String(msg._id)],
          readAt,
        });
        io.to('admins').emit('messages_marked_read', {
          userId: user.id,
          messageIds: [String(msg._id)],
          readAt,
        });
      }
    });

    //  DISCONNECT
    socket.on('disconnect', async () => {
      const { role, id } = user;

      if (role === 'user') {
        const room = `user_${id}`;
        const sockets = await io.in(room).allSockets();
        if (sockets.size === 0) {
          onlineUsers.delete(id);
          
          // ✅ Lấy avatar đồng nhất
          const avatar = socket.data.user.avatar || socket.data.user.profile?.avatar || socket.data.user.avatarUrl;
          io.to('admins').emit('user_offline', { userId: id, name: user.name, avatar });
        }
      }

      if (role === 'admin') {
        socket.data.viewingUserId = null;
        onlineAdmins.delete(id);
        const sockets = await io.in('admins').allSockets();
        if (sockets.size === 0)
          io.emit('admin_offline', { adminId: id, name: user.name });
      }
    });
  });
}