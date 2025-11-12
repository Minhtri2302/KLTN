import { FastifyInstance } from 'fastify';
import {
  createContact,
  getContacts,
  getContactById,
  updateContact,
  deleteContact
} from '../controller/contact.controller.ts';
import { verifyToken } from '../middleware/auth.ts';
import { CreateContactBody, UpdateContactBody, ContactByIdParams } from '../interface/contact.interface.ts';

export default async function contactRoutes(fastify: FastifyInstance) {

  fastify.post<{ Body: CreateContactBody }>('/', createContact);
  fastify.get('/', { preHandler: verifyToken }, getContacts);
  fastify.get<{ Params: ContactByIdParams }>('/:id', { preHandler: verifyToken }, getContactById );
  fastify.put<{ Params: ContactByIdParams; Body: UpdateContactBody }>('/:id', { preHandler: verifyToken }, updateContact );
  fastify.delete<{ Params: ContactByIdParams }>('/:id', { preHandler: verifyToken }, deleteContact );
}
