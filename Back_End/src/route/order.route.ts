import { FastifyInstance } from "fastify";
import {
  createOrder,
  getOrders,
  getOrdersByUser,
  getOrdersWithAccount,
  getOrderById,
  updateOrder,
  deleteOrder
} from "../controller/order.controller.ts";
import { verifyToken } from "../middleware/auth.ts";
import {
  CreateOrderBody,
  UpdateOrderBody,
  OrderByIdParams,
  OrderByAccountParams
} from "../interface/order.interface.ts";

export default async function orderRoutes(fastify: FastifyInstance) {
  // Create order
  fastify.post<{ Body: CreateOrderBody }>(
    '/',
    { preHandler: [verifyToken] },
    createOrder
  );

  // Get all orders (admin)
  fastify.get(
    '/',
    { preHandler: [verifyToken] },
    getOrders
  );

  // Get orders with account info
  fastify.get(
    '/with-account',
    { preHandler: [verifyToken] },
    getOrdersWithAccount
  );

  // Get orders by user
  fastify.get<{ Params: OrderByAccountParams }>(
    '/user/:accountId',
    { preHandler: [verifyToken] },
    getOrdersByUser
  );

  // Get order by ID
  fastify.get<{ Params: OrderByIdParams }>(
    '/:id',
    { preHandler: [verifyToken] },
    getOrderById
  );

  // Update order
  fastify.put<{ Params: OrderByIdParams; Body: UpdateOrderBody }>(
    '/:id',
    { preHandler: [verifyToken] },
    updateOrder
  );

  // Delete order
  fastify.delete<{ Params: OrderByIdParams }>(
    '/:id',
    { preHandler: [verifyToken] },
    deleteOrder
  );
}