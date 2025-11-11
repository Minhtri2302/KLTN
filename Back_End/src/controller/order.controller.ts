import { FastifyRequest, FastifyReply } from "fastify";
import {
  CreateOrderBody,
  UpdateOrderBody,
  OrderByIdParams,
  OrderByAccountParams
} from "../interface/order.interface.ts";
import { orderService } from "../service/order.service.ts";

const isAdmin = (req: FastifyRequest): boolean => {
  const u = (req as any).user;
  return !!u && u.role === 'admin';
};

class OrderController {
  async createOrder(req: FastifyRequest<{ Body: CreateOrderBody }>, reply: FastifyReply) {
    try {
      const user = (req as any).user;
      const body = req.body;
      
      let accountId = user && user.id ? user.id : (body as any).accountId;
      if (!accountId) {
        return reply.status(401).send({ 
          success: false,
          message: 'Unauthorized' 
        });
      }

      const result = await orderService.createOrder(accountId, body, user);
      
      return reply.status(201).send({ 
        success: true,
        message: 'Order created successfully',
        ...result 
      });
    } catch (error: any) {
      console.error('createOrder error:', error instanceof Error ? error.stack : error);
      
      // Handle stock errors specially
      if (error && error.message === 'INSUFFICIENT_STOCK') {
        return reply.status(400).send({ 
          success: false,
          message: 'Số lượng hàng không đủ', 
          details: error.details || null 
        });
      }
      
      if (error && error.message === 'INSUFFICIENT_STOCK_RACE') {
        return reply.status(409).send({ 
          success: false,
          message: 'Không thể cập nhật tồn kho do trùng lặp giao dịch, vui lòng thử lại', 
          productId: error.productId || null 
        });
      }
      
      const status = error.status || 500;
      const message = error.message || 'Internal Server Error';
      return reply.status(status).send({ 
        success: false,
        message 
      });
    }
  }

  async getOrders(req: FastifyRequest, reply: FastifyReply) {
    try {
      if (!isAdmin(req)) {
        return reply.status(403).send({ 
          success: false,
          message: 'Forbidden' 
        });
      }
      
      const orders = await orderService.getOrders();
      return reply.status(200).send({ 
        success: true,
        data: orders,
        total: orders.length 
      });
    } catch (error: any) {
      console.error('getOrders error:', error instanceof Error ? error.stack : error);
      return reply.status(500).send({ 
        success: false,
        message: 'Internal Server Error' 
      });
    }
  }

  async getOrdersByUser(req: FastifyRequest<{ Params: OrderByAccountParams }>, reply: FastifyReply) {
    try {
      const { accountId } = req.params;
      const user = (req as any).user;
      
      if (!user) {
        return reply.status(401).send({ 
          success: false,
          message: 'Unauthorized' 
        });
      }
      
      if (user.role !== 'admin' && user.id !== accountId) {
        return reply.status(403).send({ 
          success: false,
          message: 'Forbidden' 
        });
      }

      const orders = await orderService.getOrdersByUser(accountId);
      return reply.status(200).send({ 
        success: true,
        data: orders,
        total: orders.length 
      });
    } catch (error: any) {
      console.error('getOrdersByUser error:', error instanceof Error ? error.stack : error);
      const status = error.status || 500;
      const message = error.message || 'Internal Server Error';
      return reply.status(status).send({ 
        success: false,
        message 
      });
    }
  }

  async getOrdersWithAccount(req: FastifyRequest, reply: FastifyReply) {
    try {
      const orders = await orderService.getOrdersWithAccount();
      return reply.status(200).send({ 
        success: true,
        data: orders,
        total: orders.length 
      });
    } catch (error: any) {
      console.error('getOrdersWithAccount error:', error instanceof Error ? error.stack : error);
      return reply.status(500).send({ 
        success: false,
        message: 'Internal Server Error' 
      });
    }
  }

  async getOrderById(req: FastifyRequest<{ Params: OrderByIdParams }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const order = await orderService.getOrderById(id);
      
      return reply.status(200).send({ 
        success: true,
        data: order 
      });
    } catch (error: any) {
      console.error('getOrderById error:', error instanceof Error ? error.stack : error);
      const status = error.status || 500;
      const message = error.message || 'Internal Server Error';
      return reply.status(status).send({ 
        success: false,
        message 
      });
    }
  }

  async updateOrder(req: FastifyRequest<{ Params: OrderByIdParams; Body: UpdateOrderBody }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const updated = await orderService.updateOrder(id, req.body);
      
      return reply.status(200).send({ 
        success: true,
        message: 'Order updated successfully',
        data: updated 
      });
    } catch (error: any) {
      console.error('updateOrder error:', error instanceof Error ? error.stack : error);
      const status = error.status || 500;
      const message = error.message || 'Internal Server Error';
      return reply.status(status).send({ 
        success: false,
        message 
      });
    }
  }

  async deleteOrder(req: FastifyRequest<{ Params: OrderByIdParams }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const result = await orderService.deleteOrder(id);
      
      return reply.status(200).send({ 
        success: true,
        message: result.message,
        data: { id: result.id } 
      });
    } catch (error: any) {
      console.error('deleteOrder error:', error instanceof Error ? error.stack : error);
      const status = error.status || 500;
      const message = error.message || 'Internal Server Error';
      return reply.status(status).send({ 
        success: false,
        message 
      });
    }
  }
}

export const orderController = new OrderController();

// Export individual methods for route handlers
export const createOrder = orderController.createOrder.bind(orderController);
export const getOrders = orderController.getOrders.bind(orderController);
export const getOrdersByUser = orderController.getOrdersByUser.bind(orderController);
export const getOrdersWithAccount = orderController.getOrdersWithAccount.bind(orderController);
export const getOrderById = orderController.getOrderById.bind(orderController);
export const updateOrder = orderController.updateOrder.bind(orderController);
export const deleteOrder = orderController.deleteOrder.bind(orderController);
