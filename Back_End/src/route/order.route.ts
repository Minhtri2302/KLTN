import { FastifyInstance } from "fastify";
import {
  createOrder,
  getOrders,
  getOrdersByUser,
  // getOrdersWithAccount,
  getOrderById,
  updateOrder,
  cancelOrder
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

  // Update order status
  fastify.put<{ Params: OrderByIdParams; Body: UpdateOrderBody }>(
    '/:id',
    { preHandler: [verifyToken] },
    updateOrder
  );

  // Cancel order (returns stock to inventory)
  fastify.patch<{ Params: OrderByIdParams }>(
    '/:id/cancel',
    { preHandler: [verifyToken] },
    cancelOrder
  );
}