import Fastify from 'fastify';
import dotenv from 'dotenv';
import { connectDB } from './src/config/db.ts';

// route
import categoryRoutes from './src/route/category.route.ts';
import  productRoute  from './src/route/product.route.ts';
import bannerRoute from './src/route/banner.route.ts';
import accountRoutes from './src/route/account.route.ts';
import orderRoutes from './src/route/order.route.ts';
import paymentRoutes from './src/route/payment.route.ts';
import contactRoutes from './src/route/contact.route.ts';
import userRoutes from './src/route/user.route.ts';
import reviewRoutes from './src/route/review.route.ts';
import newsRoutes from './src/route/news.route.ts';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import uploadRoutes from './src/route/upload.route.ts';
import { registerSocket } from './src/utils/socket.ts';
import chatRoutes from './src/route/message.route.ts';

// Load biến môi trường
dotenv.config();

// Kết nối MongoDB
connectDB().then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

const fastify = Fastify({ logger: true });

// Đăng ký routes
fastify.register(multipart);
fastify.register(categoryRoutes, { prefix: '/category' });
fastify.register(productRoute, { prefix: '/products' });
fastify.register(bannerRoute, { prefix: '/banners' });
fastify.register(accountRoutes, { prefix: '/accounts' });
fastify.register(orderRoutes, { prefix: '/orders' });
fastify.register(paymentRoutes, { prefix: '/payments' });
fastify.register(contactRoutes, { prefix: '/contacts' });
fastify.register(reviewRoutes, { prefix: '/reviews' });
fastify.register(userRoutes, { prefix: '/users' });
fastify.register(uploadRoutes, { prefix: '/uploads' });
fastify.register(newsRoutes, { prefix: '/news' });
fastify.register(chatRoutes, { prefix: '/chat' });

fastify.register(cors, {
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
  credentials: true,
});

// Đăng ký Socket.IO trên cùng Fastify instance
registerSocket(fastify);

// Chạy server
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
fastify.listen({ port: PORT, host: '0.0.0.0' })
  .then(address => console.log(`Server đang chạy tại ${address}`))
  .catch(err => {
    fastify.log.error(err);
    process.exit(1);
  });
