import { FastifyInstance } from 'fastify';
import {
  createContact,
  getContacts,
  getContactById,
  updateContact,
  deleteContact
} from '../controller/contact.controller.ts';
import { verifyToken } from '../middleware/auth.ts';

export default async function contactRoutes(fastify: FastifyInstance) {

  fastify.post('/', createContact);
  fastify.get('/', { preHandler: verifyToken }, getContacts);
  fastify.get('/:id', { preHandler: verifyToken } as any, getContactById );
  fastify.put('/:id', { preHandler: verifyToken } as any, updateContact );
  fastify.delete('/:id', { preHandler: verifyToken } as any, deleteContact );
}
