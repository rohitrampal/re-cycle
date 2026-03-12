import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { incrementRequestCount } from '../utils/metrics.js';

const SLOW_MS = 2000; // log as slow if duration >= 2s

function errSerializer(err: Error): { type: string; message: string; stack: string } {
  return {
    type: err.name,
    message: err.message,
    stack: err.stack ?? '',
  };
}

export default async function requestLoggerPlugin(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    incrementRequestCount();
    const correlationId =
      (request.headers['x-correlation-id'] as string) || randomUUID();
    (request as any).correlationId = correlationId;
    (request as any).requestStart = Date.now();
    
    // Set request ID header for tracing
    reply.header('X-Request-ID', correlationId);
    
    const child = request.log.child({
      requestId: correlationId,
      req: {
        method: request.method,
        url: request.url,
      },
    });
    (request as any).log = child;
  });

  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const correlationId = (request as any).correlationId;
    const start = (request as any).requestStart;
    const duration = start != null ? Date.now() - start : 0;
    const method = request.method;
    const url = request.routerPath ?? request.url;
    const statusCode = reply.statusCode;

    if (correlationId) {
      reply.header('X-Correlation-Id', correlationId);
    }

    const logPayload: Record<string, unknown> = {
      correlationId,
      method,
      url,
      statusCode,
      durationMs: duration,
    };
    const reqUser = (request as any).user;
    if (reqUser?.id) logPayload.userId = reqUser.id;

    const log = (request as any).log ?? fastify.log;
    if (duration >= SLOW_MS) {
      log.warn({ ...logPayload, slow: true }, 'Slow request');
    } else {
      log.info(logPayload, `${method} ${url} ${statusCode} ${duration}ms`);
    }
  });
}

export { errSerializer };
