import { Socket } from 'socket.io';
import { JwtPayload } from 'jsonwebtoken';

export interface MyJwtPayload extends JwtPayload {
  id: string;
  role: 'user' | 'admin';
  name?: string;
  username?: string;
  avatar?: string;
  avatarUrl?: string;
}

export interface EnrichedUser extends MyJwtPayload {
  profile?: {
    avatar?: string;
    name?: string;
  };
}

export interface SocketData {
  user: EnrichedUser;
  viewingUserId?: string | null;
  chatWindowOpen?: boolean;
}

export interface AuthSocket extends Socket {
  data: SocketData;
}
