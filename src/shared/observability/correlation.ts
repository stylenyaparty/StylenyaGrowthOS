import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export const CORRELATION_HEADER = 'x-correlation-id';

declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
  }
}

export function registerCorrelation(app: FastifyInstance): void {
  app.decorateRequest('correlationId', '');
  app.addHook('onRequest', async (request) => {
    const headerValue = request.headers[CORRELATION_HEADER];
    const receivedId = typeof headerValue === 'string' ? headerValue.trim() : '';
    request.correlationId = receivedId || randomUUID();
    request.log = request.log.child({ correlationId: request.correlationId });
  });
  app.addHook('onSend', async (request, reply) => {
    setCorrelationHeader(request, reply);
  });
}

function setCorrelationHeader(request: FastifyRequest, reply: FastifyReply): void {
  reply.header(CORRELATION_HEADER, request.correlationId);
}
