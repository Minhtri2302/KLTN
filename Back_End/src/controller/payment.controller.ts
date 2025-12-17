import { FastifyRequest, FastifyReply } from 'fastify';
import Stripe from 'stripe';
import { OrderModel } from '../models/order.model.ts';
import { UserModel } from '../models/user.model.ts';
import { AccountModel } from '../models/account.model.ts';
import mongoose from 'mongoose';
import { sendOrderConfirmation } from '../utils/mailer.ts';
import { buildOrderEmail } from '../utils/emailTemplates.ts';
import { ProductModel } from "../models/products.models.ts";

const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
if (!stripeSecret) {
  console.warn('STRIPE_SECRET_KEY not set - Stripe payments will not work until configured');
}

const stripe = new Stripe(stripeSecret, { apiVersion: '2022-11-15' } as any);

// Create a Stripe Checkout session. Expects authenticated user (verifyToken middleware)
export const createCheckoutSession = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) return reply.status(401).send({ message: 'Unauthorized' });

    const body: any = req.body || {};

    // Support two modes:
    // - payload is { orderId: '<existing order id>' } -> load the order and use its items
    // - payload is { items: [...] } -> create a new order from provided items
    let items: any[] = [];
    let useExistingOrder: any = null;
    if (body.orderId) {
      // try to load order from DB
      try {
        const existing = await OrderModel.findById(body.orderId).lean();
        if (!existing) return reply.status(404).send({ message: 'Order not found' });
        // ensure ownership (if order has accountId) or allow admins (not implemented here)
        if (existing.accountId && String(existing.accountId) !== String(user.id)) {
          return reply.status(403).send({ message: 'Forbidden: order does not belong to user' });
        }
        useExistingOrder = existing;
        items = Array.isArray(existing.items) ? existing.items : [];
      } catch (e) {
        req.log?.warn?.({ err: e }, 'Failed to read existing order');
        return reply.status(400).send({ message: 'Invalid orderId' });
      }
    } else {
      items = Array.isArray(body.items) ? body.items : [];
    }

    if (!items || !items.length) return reply.status(400).send({ message: 'No items provided' });

    // Ensure items have name/image when possible (fill from ProductModel) so
    // Stripe product_data.images will contain a product image like COD flow.
    const idsToLookup = Array.from(new Set(items
      .filter((i: any) => {
        // Only lookup if productId exists and is a valid ObjectId
        if (!i.productId) return false;
        try {
          return mongoose.Types.ObjectId.isValid(i.productId) && (!i.image || i.image === '' || !i.name || i.name === '');
        } catch (e) {
          return false;
        }
      })
      .map((i: any) => i.productId)));
    if (idsToLookup.length > 0) {
      try {
        const products = await ProductModel.find({ _id: { $in: idsToLookup } }).select('name image').lean();
        const nameMap: Record<string, string> = {};
        const imageMap: Record<string, string> = {};
        products.forEach((p: any) => {
          if (p && p._id) {
            nameMap[String(p._id)] = p.name || '';
            imageMap[String(p._id)] = (p.image && typeof p.image === 'string') ? p.image : '';
          }
        });
        items.forEach((it: any) => {
          if (it.productId) {
            if ((!it.name || it.name === '') && nameMap[String(it.productId)]) it.name = nameMap[String(it.productId)];
            if ((!it.image || it.image === '') && imageMap[String(it.productId)]) it.image = imageMap[String(it.productId)];
          }
        });
      } catch (e) {
        req.log?.warn?.({ err: e }, 'createCheckoutSession: product lookup failed');
      }
    }

    const line_items = items.map((it: any) => {
      // Stripe expects integer amounts (smallest currency unit). We assume backend prices are in VND (dong) so use as-is.
      const unit_amount = Math.round(Number(it.price) || 0);
      return {
        price_data: {
          currency: (process.env.STRIPE_CURRENCY || 'vnd').toLowerCase(),
          product_data: {
            name: it.name || 'Product',
            images: it.image ? [it.image] : [], // Truyền ảnh sản phẩm vào Stripe
          },
          unit_amount,
        },
        quantity: Number(it.quantity) || 1,
      } as any;
    });

    const successUrl = (process.env.FRONTEND_URL || 'http://localhost:3000') + '/checkout?session_id={CHECKOUT_SESSION_ID}';
    const cancelUrl = (process.env.FRONTEND_URL || 'http://localhost:3000') + '/checkout?canceled=1';

    // compute total in smallest currency unit
    const total = line_items.reduce((s: number, it: any) => s + (Number(it.price_data.unit_amount || 0) * (it.quantity || 1)), 0);

    // If the client provided an existing orderId, prefer using that order directly
    // (do not create a duplicate). This keeps Stripe metadata consistent and
    // avoids edge cases where items may be missing during a second save.
    if (useExistingOrder) {
      try {
        const existingOrder = useExistingOrder;

        // create Stripe Checkout session with metadata.orderId referencing the existing order
        const meta: any = {
          accountId: user.id,
          orderId: String(existingOrder._id),
          items: JSON.stringify(items.map((it: any) => ({ productId: it.productId, quantity: it.quantity || 1 })))
        };
        if (body && body.shipping) {
          try { meta.shipping = JSON.stringify(body.shipping); } catch (e) { /* ignore */ }
        }
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items,
          mode: 'payment',
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: meta,
          shipping_address_collection: {
            allowed_countries: ['VN', 'US', 'GB', 'CA']
          },
          customer_email: (user.email || undefined),
        } as any);

        return reply.send({ url: session.url, id: session.id, orderId: existingOrder._id });
      } catch (err: any) {
        req.log?.error?.(err);
        if (err && err.type === 'StripeInvalidRequestError' && err.code === 'amount_too_large') {
          req.log?.error?.({ err }, 'Stripe amount_too_large');
          return reply.status(400).send({ message: 'Payment amount is too large for Stripe. Please choose another payment method or contact support.' });
        }
        return reply.status(500).send({ message: 'Error creating Stripe session' });
      }
    }

    // Do not persist an order before payment completion for card flows.
    // We'll let the webhook or the frontend session-status path create the order
    // after Stripe confirms payment. Here we only create a Stripe Checkout session.
    try {
      const meta: any = { 
        accountId: user.id,
        items: JSON.stringify(items.map((it: any) => ({ productId: it.productId, name: it.name, quantity: it.quantity || 1 })))
      };
      if (body && body.shipping) {
        try { meta.shipping = JSON.stringify(body.shipping); } catch (e) { /* ignore */ }
      }
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items,
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: meta,
        shipping_address_collection: {
          allowed_countries: ['VN', 'US', 'GB', 'CA']
        },
        customer_email: (user.email || undefined),
      } as any);

      return reply.send({ url: session.url, id: session.id });
    } catch (err: any) {
      req.log?.error?.(err);
      if (err && err.type === 'StripeInvalidRequestError' && err.code === 'amount_too_large') {
        req.log?.error?.({ err }, 'Stripe amount_too_large');
        return reply.status(400).send({ message: 'Payment amount is too large for Stripe. Please choose another payment method or contact support.' });
      }
      return reply.status(500).send({ message: 'Error creating Stripe session' });
    }
  } catch (err) {
    console.error('createCheckoutSession error', err);
    return reply.status(500).send({ message: 'Server error' });
  }
};

// Public endpoint to retrieve a Stripe Checkout session status by session_id
export const getSessionOrderStatus = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const { session_id } = (req.query as any) || {};
    if (!session_id) return reply.status(400).send({ message: 'session_id is required' });
    if (!stripeSecret) return reply.status(500).send({ message: 'Stripe secret is not configured' });

    const session = await stripe.checkout.sessions.retrieve(session_id as string as any);

    // Prefer payment_status (paid/unpaid), fallback to status
    const status = (session as any).payment_status || (session as any).status || 'unknown';

    // If the session is paid, proactively update the order and send confirmation
    // so that when frontend redirects to success the customer receives email.
    try {
      const paidFlag = String((session as any).payment_status || '').toLowerCase() === 'paid' || String(status).toLowerCase() === 'paid';
      if (paidFlag) {
        const orderIdMeta = (session as any).metadata && (session as any).metadata.orderId;
        if (orderIdMeta) {
          try {
            const existing = await OrderModel.findById(orderIdMeta);
            if (existing) {
              const alreadyPaid = !!(existing as any).paidAt || (existing.status && String(existing.status).toLowerCase().includes('thanh toán'));
              if (!alreadyPaid) {
                // Expand session to get line_items and images
                const fullSession = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items'] } as any);
                const lineItems = (fullSession as any).line_items?.data || [];
                // Build normalized items with image
                const normalizedFromSession = await Promise.all(lineItems.map(async (li: any, idx: number) => {
                  let image = '';
                  let productId = li.price?.product?.id || li.price?.product_data?.id || undefined;
                  let name = li.description || (li.price && li.price.product && li.price.product.name) || (li.price && li.price.product_data && li.price.product_data.name) || li.price?.nickname || 'Item';
                  // Try to get image from Stripe line_item first
                  if (li.price && li.price.product_data && Array.isArray(li.price.product_data.images) && li.price.product_data.images.length > 0) {
                    image = li.price.product_data.images[0];
                  } else if (li.price && li.price.product && Array.isArray((li.price.product as any).images) && (li.price as any).product.images.length > 0) {
                    image = (li.price as any).product.images[0];
                  }
                  // Fallback: lookup ProductModel by productId first
                  if (!image && productId) {
                    const productDoc = await ProductModel.findById(productId).select('image').lean();
                    if (productDoc && productDoc.image) image = productDoc.image;
                  }
                  // If still missing, fallback to lookup by name
                  if (!image && name) {
                    const productDoc = await ProductModel.findOne({ name }).select('image').lean();
                    if (productDoc && productDoc.image) image = productDoc.image;
                  }
                  return {
                    productId,
                    name,
                    price: Number(li.price && (li.price.unit_amount || li.price.unit_amount_decimal) || li.amount_total || 0),
                    quantity: li.quantity || 1,
                    image,
                  };
                }));
                // Merge items: Ưu tiên lấy productId từ metadata, sau đó lấy thêm image/name từ Stripe
                let itemsFromMetadata: any[] = [];
                if ((fullSession as any).metadata?.items) {
                  try {
                    itemsFromMetadata = JSON.parse((fullSession as any).metadata.items);
                  } catch (e) {
                    req.log?.warn?.({ err: e }, 'Failed to parse items from metadata for merge');
                  }
                }
                
                if (Array.isArray(existing.items) && existing.items.length) {
                  existing.items = existing.items.map((it: any, idx: number) => {
                    // Lấy productId từ metadata (chính xác hơn)
                    const metaItem = itemsFromMetadata[idx] || itemsFromMetadata.find((m: any) => m.name === it.name);
                    let productIdToUse = metaItem?.productId || it.productId;
                    
                    // Convert sang ObjectId nếu cần
                    if (productIdToUse && typeof productIdToUse === 'string' && mongoose.Types.ObjectId.isValid(productIdToUse)) {
                      productIdToUse = new mongoose.Types.ObjectId(productIdToUse);
                    }
                    
                    // Lấy image từ Stripe
                    const matchByIndex = normalizedFromSession[idx];
                    const matchByName = normalizedFromSession.find((n: any) => n.name === it.name);
                    const imageFromSession = (matchByIndex && matchByIndex.image) || (matchByName && matchByName.image) || (it as any).image || '';
                    
                    return { 
                      ...it, 
                      productId: productIdToUse, // Đảm bảo productId từ metadata và đã convert sang ObjectId
                      image: imageFromSession 
                    };
                  });
                } else if (itemsFromMetadata.length) {
                  // Nếu không có existing.items, dùng items từ metadata và bổ sung image từ Stripe
                  existing.items = itemsFromMetadata.map((metaItem: any, idx: number) => {
                    const stripeItem = normalizedFromSession[idx] || normalizedFromSession.find((n: any) => n.name === metaItem.name);
                    let productIdToUse = metaItem.productId;
                    
                    // Convert sang ObjectId nếu cần
                    if (productIdToUse && typeof productIdToUse === 'string' && mongoose.Types.ObjectId.isValid(productIdToUse)) {
                      productIdToUse = new mongoose.Types.ObjectId(productIdToUse);
                    }
                    
                    return {
                      productId: productIdToUse,
                      name: metaItem.name || stripeItem?.name || 'Product',
                      quantity: metaItem.quantity || 1,
                      price: stripeItem?.price || 0,
                      image: stripeItem?.image || ''
                    };
                  });
                } else if (normalizedFromSession.length) {
                  existing.items = normalizedFromSession;
                }
                // Prefer shipping in metadata if present
                if ((fullSession as any).metadata && (fullSession as any).metadata.shipping) {
                  try { existing.shipping = JSON.parse((fullSession as any).metadata.shipping); } catch (e) { existing.shipping = existing.shipping || (fullSession as any).customer_details || {}; }
                } else {
                  existing.shipping = existing.shipping && Object.keys(existing.shipping || {}).length ? existing.shipping : (fullSession as any).customer_details || {};
                }
                // Update order status and transaction
                existing.status = 'Chờ xử lý';
                existing.paymentMethod = 'Thẻ';
                (existing as any).paidAt = new Date();
                (existing as any).transaction = { stripeSessionId: session.id };
                await existing.save();
                
                // Giảm số lượng hàng tồn kho - sử dụng items từ metadata
                try {
                  // Lấy items từ metadata để có productId chính xác
                  let itemsToReduce: any[] = [];
                  if ((fullSession as any).metadata?.items) {
                    try {
                      itemsToReduce = JSON.parse((fullSession as any).metadata.items);
                    } catch (e) {
                      req.log?.warn?.({ err: e }, 'Failed to parse items from metadata');
                    }
                  }
                  
                  // Fallback: dùng existing.items nếu không có trong metadata
                  if (!itemsToReduce.length) {
                    itemsToReduce = existing.items.map((it: any) => ({ productId: it.productId, quantity: it.quantity }));
                  }
                  
                  for (const item of itemsToReduce) {
                    if (item.productId && mongoose.Types.ObjectId.isValid(String(item.productId))) {
                      const result = await ProductModel.findByIdAndUpdate(
                        item.productId,
                        { $inc: { stock: -(item.quantity || 1) } },
                        { new: true }
                      );
                      req.log?.info?.({ productId: item.productId, quantity: item.quantity, newStock: result?.stock }, 'Stock reduced for product');
                    } else if (item.name) {
                      // Fallback: tìm product theo tên nếu không có productId
                      const product = await ProductModel.findOne({ name: item.name });
                      if (product) {
                        await ProductModel.findByIdAndUpdate(
                          product._id,
                          { $inc: { stock: -(item.quantity || 1) } },
                          { new: true }
                        );
                        req.log?.info?.({ productName: item.name, quantity: item.quantity }, 'Stock reduced for product by name');
                      }
                    }
                  }
                  req.log?.info?.({ orderId: existing._id }, 'Stock reduced for all items');
                } catch (e) {
                  req.log?.warn?.({ err: e, orderId: existing._id }, 'Failed to reduce stock');
                }
                
                // Send confirmation email (unchanged)
                let to = '';
                try {
                  if (existing && existing.accountId) {
                    const profile = await UserModel.findOne({ accountId: String(existing.accountId) }).lean();
                    if (profile && profile.email) {
                      to = profile.email;
                    } else {
                      to = (session as any).customer_email || ((session as any).customer_details && (session as any).customer_details.email) || '';
                      if (!to) {
                        const acc = await AccountModel.findById(String(existing.accountId)).lean();
                        if (acc && typeof acc.username === 'string' && acc.username.includes('@')) to = acc.username;
                      }
                    }
                  } else {
                    to = (session as any).customer_email || ((session as any).customer_details && (session as any).customer_details.email) || '';
                  }
                } catch (e) { req.log?.warn?.({ err: e, orderId: existing._id }, 'getSessionOrderStatus: error resolving recipient email'); }
                if (to) {
                  try {
                    const subject = `Xác nhận đơn hàng ${existing._id}`;
                    const { html, text } = buildOrderEmail(existing);
                    const ok = await sendOrderConfirmation(to, subject, html, text);
                    if (!ok) req.log?.warn?.({ orderId: existing._id, to }, 'getSessionOrderStatus: sendOrderConfirmation returned falsy');
                    else req.log?.info?.({ orderId: existing._id, to }, 'getSessionOrderStatus: confirmation email sent');
                  } catch (e) {
                    req.log?.warn?.({ err: e, orderId: existing._id }, 'getSessionOrderStatus: email send error');
                  }
                } else {
                  req.log?.warn?.({ orderId: existing._id }, 'getSessionOrderStatus: no email to send confirmation to');
                }
                return reply.send({ received: true, updatedOrderId: existing._id });
              }
            }
          } catch (e) {
            req.log?.warn?.({ err: e, orderIdMeta }, 'getSessionOrderStatus: failed to update order and send email');
          }
        } else {
          // No orderId in metadata: attempt to create an order now (similar to webhook fallback)
          try {
            // Kiểm tra trùng sessionId trước khi tạo đơn hàng
            const preExisting = await OrderModel.findOne({ 'transaction.stripeSessionId': session.id }).lean();
            if (preExisting) {
              req.log?.info?.({ sessionId: session.id, existingOrderId: preExisting._id }, 'getSessionOrderStatus(fallback): session already processed before creating order - skipping');
              // Trả về JSON hợp lệ để frontend không lỗi khi gọi resp.json()
              return reply.send({
                status,
                session,
                clearCart: true,
                message: 'Order already exists for this session',
                orderId: preExisting._id
              });
            }
            // retrieve session with line items to build order
            const full = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items'] } as any);
            const lineItems = (full as any).line_items?.data || [];
            
            // Lấy items từ metadata để có productId chính xác
            let itemsFromMetadata: any[] = [];
            if ((full as any).metadata?.items) {
              try {
                itemsFromMetadata = JSON.parse((full as any).metadata.items);
              } catch (e) {
                req.log?.warn?.({ err: e }, 'Failed to parse items from metadata in fallback');
              }
            }
            
            // Build normalized items: Ưu tiên dùng productId từ metadata, bổ sung image từ Stripe
            const normalizedItems = await Promise.all(lineItems.map(async (li: any, idx: number) => {
              let image = '';
              const name = li.description || (li.price && li.price.product && li.price.product.name) || (li.price && li.price.product_data && li.price.product_data.name) || li.price?.nickname || 'Item';
              
              // Lấy productId từ metadata (chính xác hơn Stripe line_item)
              const metaItem = itemsFromMetadata[idx] || itemsFromMetadata.find((m: any) => m.name === name);
              let productId = metaItem?.productId || li.price?.product?.id || li.price?.product_data?.id || undefined;
              
              // Try to get image from Stripe line_item first
              if (li.price && li.price.product_data && Array.isArray(li.price.product_data.images) && li.price.product_data.images.length > 0) {
                image = li.price.product_data.images[0];
              } else if (li.price && li.price.product && Array.isArray((li.price.product as any).images) && (li.price as any).product.images.length > 0) {
                image = (li.price as any).product.images[0];
              }
              
              // Fallback: lookup ProductModel by productId first
              if (!image && productId) {
                try {
                  const productDoc = await ProductModel.findById(productId).select('image').lean();
                  if (productDoc && productDoc.image) image = productDoc.image;
                } catch (e) {
                  req.log?.warn?.({ err: e, productId }, 'getSessionOrderStatus(fallback): failed to lookup product by productId');
                }
              }
              
              // If still missing, fallback to lookup by name
              if (!image && name) {
                try {
                  const productDoc = await ProductModel.findOne({ name }).select('image').lean();
                  if (productDoc && productDoc.image) {
                    image = productDoc.image;
                    // Nếu không có productId, lấy từ product tìm được
                    if (!productId) productId = String(productDoc._id);
                  }
                } catch (e) {
                  req.log?.warn?.({ err: e, name }, 'getSessionOrderStatus(fallback): failed to lookup product by name');
                }
              }
              
              // Convert productId sang ObjectId nếu cần
              let finalProductId = productId;
              if (finalProductId && typeof finalProductId === 'string' && mongoose.Types.ObjectId.isValid(finalProductId)) {
                finalProductId = new mongoose.Types.ObjectId(finalProductId);
              }
              
              return {
                productId: finalProductId,
                name,
                price: Number(li.price && (li.price.unit_amount || li.price.unit_amount_decimal) || li.amount_total || 0),
                quantity: li.quantity || 1,
                image,
              };
            }));

            const accountId = (full as any).metadata && (full as any).metadata.accountId;
            interface ShippingInfo {
              email?: string;
              name?: string;
              address?: any;
              phone?: string;
            }
            let shipping: ShippingInfo = {};
            if ((full as any).metadata && (full as any).metadata.shipping) {
              try {
                shipping = JSON.parse((full as any).metadata.shipping);
              } catch (e) {
                shipping = (full as any).customer_details || {};
              }
            } else {
              shipping = (full as any).customer_details || {};
            }
            const total = normalizedItems.reduce((s: number, it: any) => s + (it.price || 0) * (it.quantity || 1), 0);

            const sessionDb = await mongoose.startSession();
            let createdOrder: any = null;
            try {
              await sessionDb.withTransaction(async () => {
                const orderObj: any = {
                  items: normalizedItems,
                  total,
                  shipping,
                  paymentMethod: 'Thẻ',
                  status: 'Chờ xử lý',
                  paidAt: new Date(),
                  transaction: { stripeSessionId: session.id },
                };
                if (accountId) orderObj.accountId = accountId;
                const orderDoc = new OrderModel(orderObj);
                try {
                  createdOrder = await orderDoc.save({ session: sessionDb });
                  
                  // Giảm số lượng hàng tồn kho - sử dụng items từ metadata
                  let itemsToReduce: any[] = [];
                  if ((full as any).metadata?.items) {
                    try {
                      itemsToReduce = JSON.parse((full as any).metadata.items);
                    } catch (e) {
                      req.log?.warn?.({ err: e }, 'Failed to parse items from metadata in fallback');
                    }
                  }
                  
                  // Fallback: dùng normalizedItems nếu không có trong metadata
                  if (!itemsToReduce.length) {
                    itemsToReduce = normalizedItems.map((it: any) => ({ productId: it.productId, quantity: it.quantity, name: it.name }));
                  }
                  
                  for (const item of itemsToReduce) {
                    if (item.productId && mongoose.Types.ObjectId.isValid(String(item.productId))) {
                      const result = await ProductModel.findByIdAndUpdate(
                        item.productId,
                        { $inc: { stock: -(item.quantity || 1) } },
                        { new: true, session: sessionDb }
                      );
                      req.log?.info?.({ productId: item.productId, quantity: item.quantity, newStock: result?.stock }, 'Stock reduced for product');
                    } else if (item.name) {
                      // Fallback: tìm product theo tên
                      const product = await ProductModel.findOne({ name: item.name }).session(sessionDb);
                      if (product) {
                        await ProductModel.findByIdAndUpdate(
                          product._id,
                          { $inc: { stock: -(item.quantity || 1) } },
                          { new: true, session: sessionDb }
                        );
                        req.log?.info?.({ productName: item.name, quantity: item.quantity }, 'Stock reduced for product by name');
                      }
                    }
                  }
                  req.log?.info?.({ orderId: orderDoc._id, itemsProcessed: itemsToReduce.length }, 'Stock reduced for all items in new order');
                } catch (err) {
                  // Nếu lỗi duplicate key, không tạo lại đơn hàng
                  if (err && (err as any).code === 11000) {
                    req.log?.warn?.({ err }, 'getSessionOrderStatus(fallback): duplicate stripeSessionId, skip creating order');
                    return;
                  }
                  throw err;
                }

                // do NOT send email inside transaction; will send after commit below
              });

              // After transaction, attempt to resolve recipient and send confirmation
              try {
                if (createdOrder) {
                  let to = '';
                  try {
                    if (createdOrder && createdOrder.accountId) {
                      const profile = await UserModel.findOne({ accountId: String(createdOrder.accountId) }).lean();
                      if (profile && profile.email) {
                        to = profile.email;
                      } else {
                        to = (full as any).customer_email || ((shipping as any).email || '') || '';
                        if (!to) {
                          const acc = await AccountModel.findById(String(createdOrder.accountId)).lean();
                          if (acc && typeof acc.username === 'string' && acc.username.includes('@')) to = acc.username;
                        }
                      }
                    } else {
                      to = (full as any).customer_email || ((shipping as any).email || '') || '';
                    }
                  } catch (e) {
                    req.log?.warn?.({ err: e, createdOrderId: createdOrder && createdOrder._id }, 'getSessionOrderStatus(fallback): error resolving recipient email');
                    to = to || (full as any).customer_email || ((shipping as any).email || '') || '';
                  }

                  req.log?.info?.({ createdOrderId: createdOrder && createdOrder._id, customerEmail: to }, 'getSessionOrderStatus(fallback): created order for paid session');
                  if (to) {
                    try {
                      const subject = `Xác nhận đơn hàng ${createdOrder._id}`;
                      const { html, text } = buildOrderEmail(createdOrder);
                      const ok = await sendOrderConfirmation(to, subject, html, text);
                      if (!ok) req.log?.warn?.({ createdOrderId: createdOrder._id, to }, 'getSessionOrderStatus(fallback): sendOrderConfirmation returned falsy');
                      else req.log?.info?.({ createdOrderId: createdOrder._id, to }, 'getSessionOrderStatus(fallback): confirmation email sent');
                    } catch (e) { req.log?.warn?.({ err: e, createdOrderId: createdOrder._id }, 'getSessionOrderStatus(fallback): Email send error'); }
                  } else {
                    req.log?.warn?.({ createdOrderId: createdOrder && createdOrder._id }, 'getSessionOrderStatus(fallback): no customer email available to send confirmation');
                  }
                }
              } catch (e) {
                req.log?.warn?.({ err: e }, 'mailer in session-status fallback error');
              }
            } finally {
              sessionDb.endSession();
            }
          } catch (e) {
            req.log?.warn?.({ err: e }, 'getSessionOrderStatus: failed to create order for paid session without metadata');
          }
        }
      }
    } catch (e) {
      req.log?.warn?.({ err: e }, 'getSessionOrderStatus: unexpected error while handling paid session');
    }
    let clearCart = false;
    try {
      const orderId = (session as any).metadata && (session as any).metadata.orderId;
      if (orderId) {
        const order = await OrderModel.findById(orderId).lean();
        if (order) {
          const paid = (order.status && String(order.status).toLowerCase().includes('thanh toán')) || !!(order as any).paidAt;
          if (paid) clearCart = true;
        }
      }
    } catch (e) {
      // don't fail the request if DB lookup fails; log and continue
      req.log?.warn?.({ err: e }, 'getSessionOrderStatus: failed to check order payment status');
    }

    return reply.send({ status, session, clearCart });
  } catch (err) {
    console.error('getSessionOrderStatus error', err instanceof Error ? err.stack : err);
    return reply.status(500).send({ message: 'Error retrieving session status', error: (err as any)?.message });
  }
};

export default { createCheckoutSession, getSessionOrderStatus };