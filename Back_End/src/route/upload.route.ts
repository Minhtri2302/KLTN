import { FastifyInstance } from 'fastify';
import { uploadImage } from '../controller/upload.controller.ts';
import { verifyToken } from '../middleware/auth.ts';

export default async function uploadRoutes(fastify: FastifyInstance) {
 
  const multipartHandler = (fastify as any).multipart ? (fastify as any).multipart() : undefined;
  if (multipartHandler) {
    // require only authentication (not admin) for uploads so regular users can upload avatars/files
    fastify.post('/image', { preHandler: [multipartHandler, verifyToken] } as any, uploadImage);
  } else {
    fastify.post('/image', { preHandler: verifyToken } as any, uploadImage);
  }
}
