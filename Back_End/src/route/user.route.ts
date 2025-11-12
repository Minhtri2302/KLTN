import { FastifyInstance } from 'fastify';
import {
  deleteUser,
  getUserById,
  createUser,
  updateUser,
  listUsers,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} from '../controller/user.controller.ts';
import { verifyToken, requireAdmin } from '../middleware/auth.ts';
import { UserByIdParams, UpdateUserBody, AddAddressBody, UpdateAddressBody, AddressIdParams } from '../interface/user.interface.ts';

export default async function userRoutes(fastify: FastifyInstance) {

  fastify.get('/', { preHandler: [verifyToken, requireAdmin] }, listUsers);
  fastify.post('/', createUser);
  fastify.get<{ Params: UserByIdParams }>('/:id', { preHandler: [verifyToken] }, getUserById);
  fastify.put<{ Params: UserByIdParams; Body: UpdateUserBody }>('/:id', { preHandler: [verifyToken] }, updateUser);
  fastify.delete<{ Params: UserByIdParams }>('/:id', { preHandler: [verifyToken, requireAdmin] }, deleteUser);
  fastify.post<{ Params: UserByIdParams; Body: AddAddressBody }>('/:id/addresses', { preHandler: [verifyToken] }, addAddress);
  fastify.put<{ Params: AddressIdParams; Body: UpdateAddressBody }>('/:id/addresses/:addressId', { preHandler: [verifyToken] }, updateAddress);
  fastify.delete<{ Params: AddressIdParams }>('/:id/addresses/:addressId', { preHandler: [verifyToken] }, deleteAddress);
  fastify.patch<{ Params: AddressIdParams }>('/:id/addresses/:addressId/default', { preHandler: [verifyToken] }, setDefaultAddress);
}
