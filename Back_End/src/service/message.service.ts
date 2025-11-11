import { MessageModel } from '../models/message.model.ts';
import { UserModel } from '../models/user.model.ts';
import { AccountModel } from '../models/account.model.ts';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { AuthSocket, EnrichedUser } from '../interface/socket.interface.ts';

// ===========================
// 🔧 HELPER FUNCTIONS
// ===========================

export async function isAnAdminViewingUser(io: SocketIOServer | undefined, userId: string): Promise<boolean> {
  if (!io) return false;
  try {
    const adminSocketIds = io.sockets.adapter.rooms.get('admins');
    if (!adminSocketIds) return false;

    const socketsMap = io.sockets.sockets;
    for (const socketId of adminSocketIds) {
      const socket = socketsMap.get(socketId);
      if (socket && (socket as AuthSocket).data?.viewingUserId === userId) {
        return true;
      }
    }
    return false;
  } catch (e) {
    console.error('Error in isAnAdminViewingUser:', e);
    return false;
  }
}

export function getUserInfo(
  profile?: { avatar?: string; name?: string } | null,
  authUser?:
    | EnrichedUser
    | {
        avatar?: string;
        avatarUrl?: string;
        name?: string;
        username?: string;
        id?: string;
      }
    | null,
  fallbackName?: string
) {
  // ✅ Ưu tiên avatar theo thứ tự: profile.avatar → authUser.avatar → authUser.avatarUrl
  const avatar = profile?.avatar || authUser?.avatar || authUser?.avatarUrl;
  const name = profile?.name || authUser?.name || authUser?.username || fallbackName;
  
  return {
    avatar,
    name,
  };
}

export function getOnlineUserIds(io: SocketIOServer | undefined): Set<string> {
  const onlineSet = new Set<string>();
  if (!io) return onlineSet;

  const sockets = Array.from((io.sockets.sockets as Map<string, Socket>).values());
  for (const s of sockets) {
    const u = (s as AuthSocket).data?.user;
    if (u?.role === 'user' && u.id) onlineSet.add(String(u.id));
  }
  return onlineSet;
}

type ParticipantUpdateOutgoing = {
  id: string;
  unreadCount?: number;
  lastMessage?: string;
  lastMessageAt?: Date;
};

export async function emitParticipantUpdate(
  io: SocketIOServer | undefined,
  userId: string,
  changes: {
    unreadCount?: number;
    lastMessage?: string;
    lastMessageAt?: Date;
    markAsRead?: boolean;
  }
) {
  if (!io) return;
  try {
    const update: ParticipantUpdateOutgoing = { id: String(userId) };

    if (changes.unreadCount !== undefined) update.unreadCount = changes.unreadCount;
    if (changes.markAsRead) update.unreadCount = 0;
    if (changes.lastMessage) {
      update.lastMessage = changes.lastMessage;
      update.lastMessageAt = changes.lastMessageAt;
    }

    io.to('admins').emit('participant_updated', update);
  } catch (e) {
    console.warn('emitParticipantUpdate error', e);
  }
}

// ===========================
// 📡 SERVICE CLASS
// ===========================

export class MessageService {
  async getOnlineUsers(io: SocketIOServer) {
    const sockets = Array.from((io.sockets.sockets as Map<string, Socket>).values()) as AuthSocket[];
    const users = sockets
      .map((s) => s.data?.user)
      .filter((u) => u?.role === 'user')
      .map((u) => ({
        id: u.id,
        name: u.name || u.username,
        socketId: u.socketId,
        // ✅ Ưu tiên avatar theo thứ tự rõ ràng
        avatar: u.avatar || u.profile?.avatar || u.avatarUrl,
      }));

    return users;
  }

  async getAdminInfo() {
    const adminAccount = await AccountModel.findOne({ role: 'admin' }).lean();
    if (!adminAccount) {
      throw { status: 404, message: 'Admin not found' };
    }

    let profile: { avatar?: string; name?: string } | null | undefined =
      await UserModel.findOne({ accountId: adminAccount._id }).lean();
    const { avatar, name } = getUserInfo(profile, adminAccount, adminAccount.username);

    return {
      id: String(adminAccount._id),
      username: adminAccount.username,
      name,
      avatar,
    };
  }

  async getChatParticipants(io: SocketIOServer | undefined) {
    const rawIds = await MessageModel.distinct('userId');
    const ids = Array.from(new Set(rawIds.map(String)));
    if (ids.length === 0) return [];

    const profiles = await UserModel.find({ accountId: { $in: ids } }).lean();
    const profileMap = new Map(profiles.map((p) => [String(p.accountId), p]));

    const onlineSet = getOnlineUserIds(io);

    const unreadAgg = await MessageModel.aggregate([
      { $match: { fromId: { $in: ids }, read: { $ne: true } } },
      { $group: { _id: '$fromId', unreadCount: { $sum: 1 } } },
    ]).allowDiskUse(true);
    const unreadMap = new Map(unreadAgg.map((r) => [String(r._id), r.unreadCount || 0]));

    const lastMsgAgg = await MessageModel.aggregate([
      { $match: { userId: { $in: ids } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$userId',
          message: { $first: '$message' },
          createdAt: { $first: '$createdAt' },
        },
      },
    ]).allowDiskUse(true);
    const lastMsgMap = new Map(
      lastMsgAgg.map((r) => [String(r._id), { message: r.message || '', time: r.createdAt }])
    );

    const result = ids.map((id) => {
      const profile = profileMap.get(id);
      const lastMsg = lastMsgMap.get(id);
      return {
        id,
        name: profile?.name || `User${id}`,
        avatar: profile?.avatar,
        online: onlineSet.has(id),
        unreadCount: unreadMap.get(id) || 0,
        lastMessage: lastMsg?.message,
        lastMessageAt: lastMsg?.time,
      };
    });

    result.sort((a, b) => {
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return timeB - timeA;
    });

    return result;
  }

  async getHistoryByUserId(
    userId: string,
    requesterRole?: string,
    io?: SocketIOServer
  ) {
    const messages = await MessageModel.find({ userId: String(userId) }).sort({ createdAt: 1 }).lean();
    let profile: { avatar?: string; name?: string } | null | undefined =
      await UserModel.findOne({ accountId: String(userId) }).lean();

    if (requesterRole === 'admin') {
      try {
        const unreadMessages = await MessageModel.find({
          userId: String(userId),
          fromId: String(userId),
          read: { $ne: true },
        }).select('_id').lean();

        if (unreadMessages.length > 0) {
          const messageIds = unreadMessages.map((m) => String(m._id));
          await MessageModel.updateMany({ _id: { $in: messageIds } }, { $set: { read: true, readAt: new Date() } });

          if (io) {
            io.to(`user_${userId}`).emit('messages_marked_read', {
              userId: String(userId),
              messageIds,
              readAt: new Date().toISOString(),
            });
          }
          await emitParticipantUpdate(io, String(userId), { markAsRead: true });
        }
      } catch (e) {
        console.error('Error marking messages as read:', e);
      }
    }

    // ✅ LUÔN ENRICH AVATAR, KỂ CẢ KHI KHÔNG CÓ PROFILE
    const enrichedMessages = (messages as Array<Record<string, unknown>>).map((m) => {
      const msg = m as Record<string, unknown>;
      const fromUserId = String(msg.fromId) === String(userId);
      
      // Nếu tin nhắn từ user này, dùng avatar từ profile
      // Nếu tin nhắn từ admin, giữ nguyên avatar đã lưu
      const avatar = fromUserId 
        ? (profile?.avatar || msg.avatar as string)
        : (msg.avatar as string);
      
      return {
        ...msg,
        avatar,
        author: (msg.author as string) || profile?.name || `User${userId}`,
      };
    });

    return enrichedMessages;
  }

  async sendMessageAdmin(
    toUserId: string,
    messageText: string,
    authUser: EnrichedUser,
    io: SocketIOServer | undefined
  ) {
    let profile: { avatar?: string; name?: string } | null | undefined =
      (authUser.profile as { avatar?: string; name?: string } | null | undefined) ||
      (await UserModel.findOne({ accountId: String(authUser.id) }).lean());

    const { avatar, name } = getUserInfo(profile, authUser, 'admin');

    // --- ✅ MARK 2 CHIỀU - CHECK CHAT WINDOW OPEN ---
    let isUserViewing = false;
    if (io) {
      const socketsMap = io.sockets.sockets as Map<string, Socket>;
      for (const s of socketsMap.values()) {
        const sock = s as AuthSocket;
        if (sock.data?.user?.role === 'user' && 
            String(sock.data.user.id) === toUserId && 
            sock.data.chatWindowOpen === true) {
          isUserViewing = true;
          break;
        }
      }
    }
    const readStatus = isUserViewing;
    const readAt = readStatus ? new Date() : undefined;

    const created = await MessageModel.create({
      userId: toUserId,
      author: name,
      authorId: String(authUser.id),
      fromId: String(authUser.id),
      toUserId,
      message: messageText,
      time: new Date().toISOString(),
      avatar,
      read: readStatus,
      readAt,
    });

    const payload = created.toObject ? created.toObject() : created;
    if (payload._id) payload._id = String(payload._id);

    if (io) {
      io.to(`user_${toUserId}`).emit('receive_message', payload);
      io.to('admins').emit('receive_message', payload);

      if (isUserViewing) {
        io.to(`user_${toUserId}`).emit('messages_marked_read', {
          userId: toUserId,
          messageIds: [String(payload._id)],
          readAt: readAt?.toISOString(),
        });
        io.to('admins').emit('messages_marked_read', {
          userId: toUserId,
          messageIds: [String(payload._id)],
          readAt: readAt?.toISOString(),
        });
        await emitParticipantUpdate(io, toUserId, { markAsRead: true });
      } else {
        await emitParticipantUpdate(io, toUserId, {
          lastMessage: messageText,
          lastMessageAt: new Date(payload.time),
        });
      }
    }

    return payload;
  }

  async sendMessageUser(
    messageText: string,
    authUser: EnrichedUser,
    io: SocketIOServer | undefined
  ) {
    const userId = String(authUser.id);

    let profile: { avatar?: string; name?: string } | null | undefined =
      (authUser.profile as { avatar?: string; name?: string } | null | undefined) ||
      (await UserModel.findOne({ accountId: userId }).lean());

    const { avatar, name } = getUserInfo(profile, authUser, `User${userId}`);

    const isAdminViewing = await isAnAdminViewingUser(io, userId);
    const readStatus = isAdminViewing;

    const created = await MessageModel.create({
      userId,
      author: name,
      authorId: userId,
      fromId: userId,
      message: messageText,
      time: new Date().toISOString(),
      avatar,
      read: readStatus,
      readAt: readStatus ? new Date() : undefined,
    });

    const payload = created.toObject ? created.toObject() : created;
    if (payload._id) payload._id = String(payload._id);

    if (io) {
      io.to('admins').emit('receive_message', payload);
      io.to(`user_${userId}`).emit('receive_message', payload);

      const newUnreadCount = await MessageModel.countDocuments({
        userId,
        fromId: userId,
        read: { $ne: true },
      });

      await emitParticipantUpdate(io, userId, {
        lastMessage: messageText,
        lastMessageAt: new Date(payload.time),
        unreadCount: newUnreadCount,
      });
    }

    return payload;
  }
}

export const messageService = new MessageService();
