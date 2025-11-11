import { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";

export const requireAdmin = (req: FastifyRequest, reply: FastifyReply, done: any) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return reply.status(403).send({ message: 'Chỉ admin mới được phép truy cập' });
  }
  done();
};

export const requireUser = (req: FastifyRequest, reply: FastifyReply, done: any) => {
  const user = (req as any).user;
  if (!user || user.role !== 'user') {
    return reply.status(403).send({ message: 'Chỉ user mới được phép truy cập' });
  }
  done();
};

export const verifyToken = (req: FastifyRequest, reply: FastifyReply, done: any) => {
  try {
    const auth = (req.headers as any).authorization || (req.headers as any).Authorization;
    if (!auth) return reply.status(401).send({ message: 'No token provided' });
    const parts = auth.split(' ');
    if (parts.length !== 2) return reply.status(401).send({ message: 'Token error' });
    const token = parts[1];
    const secret = process.env.JWT_SECRET || 'changeme';
    const payload = jwt.verify(token, secret) as any;
    (req as any).user = payload;
    done();
  } catch (err) {
    console.error('verifyToken error', err);
    return reply.status(401).send({ message: 'Invalid token' });
  }
};

// allow access if request user is admin OR owner of the resource (params.id)
export const requireOwnerOrAdmin = (req: FastifyRequest, reply: FastifyReply, done: any) => {
  const user = (req as any).user;
  const params = (req as any).params || {};
  const targetId = params.id;
  if (!user) return reply.status(401).send({ message: 'No token provided' });
  // admin can always proceed
  if (user.role === 'admin') return done();
  // owner - compare user id (from token) with requested id
  // token `id` is account id; allow if matches
  if (String(user.id) === String(targetId) || String(user._id) === String(targetId)) return done();
  return reply.status(403).send({ message: 'Chỉ admin hoặc chủ tài khoản mới được phép truy cập' });
};
