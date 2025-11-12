import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateContactBody, UpdateContactBody, ContactByIdParams } from '../interface/contact.interface.ts';
import { contactService } from '../service/contact.service.ts';

export const createContact = async (
  req: FastifyRequest<{ Body: CreateContactBody }>,
  reply: FastifyReply
) => {
  try {
    const doc = await contactService.createContact(req.body);
    return reply.status(200).send(doc);
  } catch (err: any) {
    console.error('createContact', err);
    if (err.status) {
      return reply.status(err.status).send({ message: err.message });
    }
    return reply.status(500).send({ message: 'Server error' });
  }
};

export const getContacts = async (_req: FastifyRequest, reply: FastifyReply) => {
  try {
    const list = await contactService.getContacts();
    return reply.send({ data: list });
  } catch (err) {
    console.error('getContacts', err);
    return reply.status(500).send({ message: 'Server error' });
  }
};

export const getContactById = async (
  req: FastifyRequest<{ Params: ContactByIdParams }>,
  reply: FastifyReply
) => {
  try {
    const { id } = req.params;
    const doc = await contactService.getContactById(id);
    return reply.send(doc);
  } catch (err: any) {
    console.error('getContactById', err);
    if (err.status) {
      return reply.status(err.status).send({ message: err.message });
    }
    return reply.status(500).send({ message: 'Server error' });
  }
};

export const updateContact = async (
  req: FastifyRequest<{ Params: ContactByIdParams; Body: UpdateContactBody }>,
  reply: FastifyReply
) => {
  try {
    const { id } = req.params;
    const updated = await contactService.updateContact(id, req.body);
    return reply.send(updated);
  } catch (err: any) {
    console.error('updateContact', err);
    if (err.status) {
      return reply.status(err.status).send({ message: err.message });
    }
    return reply.status(500).send({ message: 'Server error' });
  }
};

export const deleteContact = async (
  req: FastifyRequest<{ Params: ContactByIdParams }>,
  reply: FastifyReply
) => {
  try {
    const { id } = req.params;
    const result = await contactService.deleteContact(id);
    return reply.send(result);
  } catch (err: any) {
    console.error('deleteContact', err);
    if (err.status) {
      return reply.status(err.status).send({ message: err.message });
    }
    return reply.status(500).send({ message: 'Server error' });
  }
};
