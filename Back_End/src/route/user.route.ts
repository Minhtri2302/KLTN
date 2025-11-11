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

export default async function userRoutes(fastify: FastifyInstance) {

  fastify.get('/', { preHandler: [verifyToken , requireAdmin ] }as any, listUsers);
  fastify.post('/', createUser);
  fastify.get('/:id', { preHandler: [verifyToken ]}as any, getUserById);
  fastify.put('/:id', { preHandler: [verifyToken ] }as any, updateUser);
  fastify.delete('/:id', { preHandler: [verifyToken , requireAdmin ] }as any, deleteUser);
  fastify.post('/:id/addresses', { preHandler: [verifyToken ] }as any, addAddress);
  fastify.put('/:id/addresses/:addressId', { preHandler: [verifyToken ] }as any, updateAddress);
  fastify.delete('/:id/addresses/:addressId', { preHandler: [verifyToken ] }as any, deleteAddress);
  fastify.patch('/:id/addresses/:addressId/default', { preHandler: [verifyToken ] }as any, setDefaultAddress);
}
