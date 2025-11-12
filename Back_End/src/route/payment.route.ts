import { FastifyInstance } from 'fastify';
import { verifyToken } from '../middleware/auth.ts';
import { createCheckoutSession, /*stripeWebhookHandler*/ getSessionOrderStatus } from '../controller/payment.controller.ts';

export default async function paymentRoutes(fastify: FastifyInstance) {
  // create checkout session (requires auth so we can attach accountId)
  fastify.post('/create-checkout-session', { preHandler: [verifyToken] }, createCheckoutSession);

  fastify.get<{ Querystring: { session_id: string } }>(
    '/session-status',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            session_id: { type: 'string' },
          },
          required: ['session_id'],
        },
      },
    },
    getSessionOrderStatus
  );
}
