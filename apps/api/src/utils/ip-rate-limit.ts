import { FastifyRequest } from 'fastify';
import { checkRouteRateLimit } from './route-rate-limit';
import { getClientIp } from './ip-utils';

/**
 * IP-based rate limiting to prevent DoS attacks
 * Limits requests per IP address regardless of authentication status
 */
export async function checkIpRateLimit(
  request: FastifyRequest,
  key: string,
  max: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const ip = getClientIp(request);
  const rateLimitKey = `${key}:ip:${ip}`;
  return checkRouteRateLimit(rateLimitKey, max, windowMs);
}

/**
 * Rate limit middleware factory for IP-based protection
 */
export function createIpRateLimitMiddleware(
  key: string,
  max: number,
  windowMs: number
) {
  return async (request: FastifyRequest, reply: any) => {
    const result = await checkIpRateLimit(request, key, max, windowMs);
    
    reply.header('X-RateLimit-Limit', max);
    reply.header('X-RateLimit-Remaining', result.remaining);
    reply.header('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));
    
    if (!result.allowed) {
      return reply.code(429).send({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP. Please try again later.',
        },
      });
    }
  };
}
