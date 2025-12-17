import { FastifyInstance } from 'fastify';
import { getOverallStatistics, getMonthlyStatistics } from '../controller/statistics.controller.ts';
import { verifyToken } from '../middleware/auth.ts';

export default async function statisticsRoutes(fastify: FastifyInstance) {
  // Lấy thống kê tổng quan (yêu cầu xác thực)
  fastify.get('/overall', { preHandler: [verifyToken] }, getOverallStatistics);

  // Lấy thống kê theo tháng (yêu cầu xác thực)
  fastify.get('/monthly', { preHandler: [verifyToken] }, getMonthlyStatistics);
}
