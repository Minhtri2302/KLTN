import jwt, { JwtPayload } from 'jsonwebtoken';
import { Socket } from 'socket.io';
export interface Message {
    userId?: string; // conversation owner (user_<id>)
    author: string;
    authorId?: string;
    fromId?: string | number;
    toUserId?: string | number;
    message: string;
    time: string;
    avatar?: string;
    read?: boolean;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    // optional id
    _id?: string;
}
// ======================== TYPES ==========================
interface MyJwtPayload extends JwtPayload {
  id: string;
  role: 'user' | 'admin';
  name?: string;
  username?: string;
  avatar?: string;
  avatarUrl?: string;
}

interface EnrichedUser extends MyJwtPayload {
  profile?: {
    avatar?: string;
    name?: string;
  };
}

interface SocketData {
  user: EnrichedUser;
  viewingUserId?: string | null;
  chatWindowOpen?: boolean; 
}

interface AuthSocket extends Socket {
  data: SocketData;
}