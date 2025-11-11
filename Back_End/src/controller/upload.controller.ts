import { FastifyRequest, FastifyReply } from 'fastify';
import cloudinary from '../config/cloudinary.ts';

export const uploadImage = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const multipart = req as any;
    const data = await multipart.file();
    if (!data) return reply.code(400).send({ message: 'No file provided' });

    const stream = data.file; 

    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'kltu_products' },
        (error: any, res: any) => {
          if (error) return reject(error);
          return resolve(res);
        }
      );

      stream.pipe(uploadStream).on('error', (err: any) => reject(err));
    });

    if (!result) {
      return reply.code(500).send({ message: 'Upload failed, no result' });
    }

    return reply.code(201).send({ url: result.secure_url, public_id: result.public_id });
  } catch (err) {
    console.error('uploadImage error:', (err as any) && ((err as any).stack || err));
    return reply.code(500).send({ message: 'Upload failed', error: (err as any)?.message || err });
  }
};
