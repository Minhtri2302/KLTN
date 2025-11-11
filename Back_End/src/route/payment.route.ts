import { FastifyInstance } from 'fastify';
import { verifyToken } from '../middleware/auth.ts';
import { createCheckoutSession, /*stripeWebhookHandler*/ getSessionOrderStatus } from '../controller/payment.controller.ts';

export default async function paymentRoutes(fastify: FastifyInstance) {
  // create checkout session (requires auth so we can attach accountId)
  fastify.post('/create-checkout-session', { preHandler: [verifyToken] } as any, createCheckoutSession);

  fastify.get(
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
    } as any,
    getSessionOrderStatus
  );
}
