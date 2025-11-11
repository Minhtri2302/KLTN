import { OrderModel } from "../models/order.model.ts";
import { ProductModel } from "../models/products.models.ts";
import mongoose from "mongoose";
import { sendOrderConfirmation } from '../utils/mailer.ts';
import { buildOrderEmail } from '../utils/emailTemplates.ts';
import {
  CreateOrderBody,
  UpdateOrderBody,
  OrderItem
} from "../interface/order.interface.ts";

class OrderService {
  async createOrder(
    accountId: string,
    body: CreateOrderBody,
    user: any
  ): Promise<{ id: any }> {
    try {
      const { items } = body;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        throw { status: 400, message: 'Invalid order data' };
      }

      // Include image in normalized items; fallback to product lookup for missing name/image
      const normalizedItems: OrderItem[] = items.map((it: any) => ({
        productId: it.productId,
        name: it.name || '',
        image: (it as any).image || '',
        price: Number(it.price) || 0,
        quantity: Number(it.quantity) || 1,
      }));

      // Lookup missing product info
      const idsToLookup = Array.from(new Set(normalizedItems
        .filter(i => (!i.name || i.name === '' || !(i as any).image) && i.productId)
        .map(i => i.productId)));

      if (idsToLookup.length > 0) {
        try {
          const products = await ProductModel.find({ _id: { $in: idsToLookup } })
            .select('name image')
            .lean();
          
          const nameMap: Record<string, string> = {};
          const imageMap: Record<string, string> = {};
          
          products.forEach((p: any) => {
            if (p && p._id) {
              nameMap[String(p._id)] = p.name || '';
              imageMap[String(p._id)] = (p.image && typeof p.image === 'string') ? p.image : '';
            }
          });
          
          normalizedItems.forEach(i => {
            if ((!i.name || i.name === '') && i.productId) {
              i.name = nameMap[String(i.productId)] || '';
            }
            if ((!(i as any).image || (i as any).image === '') && i.productId) {
              (i as any).image = imageMap[String(i.productId)] || '';
            }
          });
        } catch (e) {
          // Ignore lookup failures
        }
      }

      const total = normalizedItems.reduce((s, it) => s + (it.price || 0) * (it.quantity || 0), 0);

      const session = await mongoose.startSession();
      let createdOrder: any = null;

      try {
        await session.withTransaction(async () => {
          const shipping = body.shipping || null;
          const paymentMethod = body.paymentMethod && typeof body.paymentMethod === 'string' 
            ? body.paymentMethod 
            : 'Tiền mặt';
          
          const allowedMethods = ['Tiền mặt', 'Thẻ', 'Momo', 'Chuyển khoản ngân hàng'];
          if (!allowedMethods.includes(paymentMethod)) {
            throw { status: 400, message: 'Phương thức thanh toán không hợp lệ' };
          }

          // --- CHECK STOCK AVAILABILITY BEFORE CREATING ORDER ---
          const productItems = normalizedItems.filter(it => it.productId);
          if (productItems.length > 0) {
            const insufficient: Array<any> = [];
            
            for (const it of productItems) {
              const prod = await ProductModel.findById(it.productId)
                .select('stock name')
                .session(session)
                .lean();
              
              // If product exists and has numeric stock, validate
              if (prod && typeof (prod as any).stock === 'number') {
                if ((prod as any).stock < (it.quantity || 0)) {
                  insufficient.push({
                    productId: String(it.productId),
                    name: (prod as any).name || '',
                    available: (prod as any).stock,
                    requested: it.quantity
                  });
                }
              }
            }
            
            if (insufficient.length > 0) {
              // Abort transaction by throwing special error
              const e: any = new Error('INSUFFICIENT_STOCK');
              e.details = insufficient;
              throw e;
            }
          }

          // Create order
          const orderDoc = new OrderModel({
            accountId,
            items: normalizedItems,
            total,
            shipping,
            paymentMethod
          });
          createdOrder = await orderDoc.save({ session });

          // --- DECREMENT PRODUCT STOCKS (within the same transaction) ---
          for (const it of normalizedItems) {
            if (!it.productId) continue;
            
            // Use conditional update to guard against race conditions
            const updated = await ProductModel.findOneAndUpdate(
              { _id: it.productId, $expr: { $gte: ["$stock", it.quantity || 0] } },
              { $inc: { stock: -(it.quantity || 0) } },
              { session }
            );
            
            if (!updated) {
              const e: any = new Error('INSUFFICIENT_STOCK_RACE');
              e.productId = it.productId;
              throw e;
            }
          }

          // Send confirmation email (for non-card payments)
          try {
            const paymentMethod = body.paymentMethod || 'Tiền mặt';
            if (paymentMethod !== 'Thẻ') {
              const to = (user && (user.email || user.emailAddress)) || 
                         (shipping && shipping.email) || '';
              
              if (to) {
                const subject = `Xác nhận đơn hàng ${createdOrder._id}`;
                const { html, text } = buildOrderEmail(createdOrder);
                
                sendOrderConfirmation(to, subject, html, text)
                  .then(ok => {
                    if (!ok) console.warn('Email not sent for order', createdOrder._id);
                  })
                  .catch(e => console.warn('Email send error', e));
              }
            }
          } catch (e) {
            console.warn('mailer error', e);
          }
        });
      } finally {
        session.endSession();
      }

      return { id: createdOrder._id };
    } catch (error) {
      throw error;
    }
  }

  async getOrders(): Promise<any[]> {
    try {
      const orders = await OrderModel.find().lean();
      return orders;
    } catch (error) {
      throw error;
    }
  }

  async getOrdersByUser(accountId: string): Promise<any[]> {
    try {
      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        throw { status: 400, message: 'Invalid accountId' };
      }
      
      const orders = await OrderModel.find({ accountId }).lean();
      return orders;
    } catch (error) {
      throw error;
    }
  }

  async getOrdersWithAccount(): Promise<any[]> {
    try {
      const orders = await OrderModel.find().lean();
      return orders;
    } catch (error) {
      throw error;
    }
  }

  async getOrderById(id: string): Promise<any> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw { status: 400, message: 'Invalid id' };
      }

      const order = await OrderModel.findById(id).lean();
      if (!order) {
        throw { status: 404, message: 'Order not found' };
      }

      return order;
    } catch (error) {
      throw error;
    }
  }

  async updateOrder(id: string, body: UpdateOrderBody): Promise<any> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw { status: 400, message: 'Invalid id' };
      }

      const update: any = { ...(body || {}) };
      if (update._id) delete update._id;

      // Nếu có items, điền thông tin name/image từ ProductModel nếu thiếu
      if (update.items && Array.isArray(update.items) && update.items.length > 0) {
        // Validate và normalize productId trong items
        update.items = update.items.map((item: any) => {
          // Nếu productId không hợp lệ hoặc không tồn tại, vẫn giữ lại item
          // nhưng set productId = null để tránh lỗi validation
          if (item.productId) {
            const isValid = mongoose.Types.ObjectId.isValid(item.productId);
            if (!isValid) {
              console.warn(`Invalid productId: ${item.productId}, setting to null`);
              return { ...item, productId: null };
            }
          }
          return item;
        });

        // Lấy danh sách productId hợp lệ cần lookup
        const productIds = update.items
          .filter((item: any) => item.productId && mongoose.Types.ObjectId.isValid(item.productId))
          .filter((item: any) => !item.image || !item.name)
          .map((item: any) => item.productId);

        if (productIds.length > 0) {
          try {
            const products = await ProductModel.find({ _id: { $in: productIds } })
              .select('_id name image price')
              .lean();

            const productMap = new Map(
              products.map((p: any) => [String(p._id), p])
            );

            update.items = update.items.map((item: any) => {
              if (!item.productId) return item;
              
              const product = productMap.get(String(item.productId));
              if (product) {
                return {
                  ...item,
                  name: item.name || product.name || '',
                  image: item.image || product.image || '',
                  price: item.price != null ? item.price : product.price || 0
                };
              }
              return item;
            });
          } catch (err) {
            console.warn('Failed to lookup products for order update:', err);
          }
        }
      }

      const updated = await OrderModel.findByIdAndUpdate(id, update, { 
        new: true,
        runValidators: true 
      });

      if (!updated) {
        throw { status: 404, message: 'Order not found' };
      }

      return updated;
    } catch (error) {
      throw error;
    }
  }

  async deleteOrder(id: string): Promise<{ message: string; id: any }> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw { status: 400, message: 'Invalid id' };
      }

      const deleted = await OrderModel.findByIdAndDelete(id);
      if (!deleted) {
        throw { status: 404, message: 'Order not found' };
      }

      return { message: 'Order deleted successfully', id: deleted._id };
    } catch (error) {
      throw error;
    }
  }
}

export const orderService = new OrderService();
