import { FastifyReply, FastifyRequest } from 'fastify';
import { Category } from '../interface/category.interface.ts';
import { categoryService } from '../service/category.service.ts';

export const getAllCategory = async (_req: FastifyRequest, reply: FastifyReply) => {
  try {
    const categories = await categoryService.getAllCategories();
    reply.send(categories);
  } catch (error) {
    reply.status(500).send({ message: (error as Error).message });
  }
};

export const createCategory = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    let name: string | undefined = undefined;
    let imageUrl: string | undefined = undefined;

    const multipartReq = req as any;
    if (multipartReq && typeof multipartReq.isMultipart === 'function' && multipartReq.isMultipart()) {
      for await (const part of multipartReq.parts()) {
        if (part.type === 'file') {
          const stream = part.file;
          try {
            imageUrl = await categoryService.uploadImage(stream);
          } catch (err) {
            return reply.status(500).send({ message: 'Image upload failed', error: (err as any)?.message || err });
          }
        } else {
          if (part.fieldname === 'name' && typeof part.value === 'string') name = part.value;
        }
      }
    } else {
      const body = req.body as Category;
      name = body?.name;
    }

    const category = await categoryService.createCategory(name!, imageUrl);
    reply.status(201).send(category);
  } catch (error: any) {
    if (error.status) {
      return reply.status(error.status).send({ message: error.message });
    }
    reply.status(500).send({ message: (error as Error).message });
  }
};

export const updateCategory = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
  try {
    const { id } = req.params;
    let name: string | undefined = undefined;
    let imageUrl: string | undefined = undefined;
    const multipartReq = req;
    if (multipartReq && typeof multipartReq.isMultipart === 'function' && multipartReq.isMultipart()) {
      for await (const part of multipartReq.parts()) {
        if (part.type === 'file') {
          // Only process file if it has a filename (not empty)
          if (part.filename && part.filename.length > 0) {
            const stream = part.file;
            try {
              imageUrl = await categoryService.uploadImage(stream);
            } catch (err) {
              console.error('Image upload error:', err);
              return reply.status(500).send({ message: 'Image upload failed', error: (err as any)?.message || err });
            }
          }
          // Skip empty file - will keep old image
        } else {
          // regular field
          if (part.fieldname === 'name' && typeof part.value === 'string') {
            name = part.value;
          }
        }
      }
    } else {
      // normal JSON body
      const body = req.body as Category;
      name = body?.name;
    }

    console.log('Update category - id:', id, 'name:', name, 'imageUrl:', imageUrl);
    
    const category = await categoryService.updateCategory(id, name, imageUrl);
    reply.send(category);
  } catch (error: any) {
    console.error('updateCategory error:', error);
    if (error.status) {
      return reply.status(error.status).send({ message: error.message });
    }
    reply.status(500).send({ message: (error as Error).message });
  }
};

export const deleteCategory = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
  try {
    const { id } = req.params;
    const result = await categoryService.deleteCategory(id);
    reply.send(result);
  } catch (error: any) {
    if (error.status) {
      return reply.status(error.status).send({ message: error.message });
    }
    reply.status(500).send({ message: (error as Error).message });
  }
};
