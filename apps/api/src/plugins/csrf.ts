/**
 * CSRF protection using Double Submit Cookie pattern + Origin validation
 * 
 * Strategy:
 * 1. Set CSRF token cookie on GET requests (readable by JavaScript)
 * 2. Require CSRF token in header for state-changing requests
 * 3. Validate that cookie token matches header token
 * 4. Also validate Origin header as additional layer
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateCsrfToken, validateCsrfToken } from '../utils/csrf';
import { config } from '../config';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'x-csrf-token';

function getRequestOrigin(req: FastifyRequest): string | null {
  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin) return origin;
  const referer = req.headers.referer;
  if (typeof referer === 'string' && referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }
  return null;
}

function parseAllowedOrigins(corsOrigin: string): string[] {
  return corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);
}

export default async function csrfPlugin(
  fastify: FastifyInstance,
  opts: { allowedOrigins: string[] }
): Promise<void> {
  const allowed = new Set(opts.allowedOrigins.map((o) => o.toLowerCase()));

  // Set CSRF token cookie on GET requests (if not already set)
  // Skip for /api/csrf-token so that route can set cookie and return token in body (cross-origin friendly)
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.url === '/api/csrf-token') return;
    // Only set cookie on GET requests to avoid unnecessary cookie setting
    if (request.method === 'GET' && !request.cookies[CSRF_COOKIE_NAME]) {
      const token = generateCsrfToken();
      reply.setCookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false, // Must be readable by JavaScript for Double Submit Cookie pattern
        secure: config.isProduction, // HTTPS only in production
        sameSite: 'strict', // Prevent CSRF attacks
        path: '/',
        maxAge: 24 * 60 * 60, // 24 hours
      });
    }
  });

  // Validate CSRF token on state-changing requests
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip CSRF check for non-state-changing methods
    if (!STATE_CHANGING_METHODS.has(request.method)) return;

    // Skip CSRF check for auth endpoints (they have their own protection mechanisms)
    // Auth endpoints use password-based authentication which is CSRF-resistant
    if (request.url.startsWith('/api/auth/')) return;

    // Get CSRF token from cookie
    const cookieToken = request.cookies[CSRF_COOKIE_NAME];
    
    // Get CSRF token from header
    const headerToken = request.headers[CSRF_HEADER_NAME] as string | undefined;

    // Require both cookie and header token
    if (!cookieToken || !headerToken) {
      return reply.code(403).send({
        success: false,
        error: {
          code: 'CSRF_TOKEN_MISSING',
          message: 'CSRF token required. Please include X-CSRF-Token header.',
        },
      });
    }

    // Validate that tokens match (Double Submit Cookie pattern)
    if (!validateCsrfToken(headerToken, cookieToken)) {
      return reply.code(403).send({
        success: false,
        error: {
          code: 'CSRF_TOKEN_INVALID',
          message: 'Invalid CSRF token',
        },
      });
    }

    // Additional layer: Validate Origin header
    const origin = getRequestOrigin(request);
    if (origin && !allowed.has(origin.toLowerCase())) {
      return reply.code(403).send({
        success: false,
        error: {
          code: 'CSRF_INVALID_ORIGIN',
          message: 'Request origin not allowed',
        },
      });
    }
  });
}

export function buildAllowedOrigins(corsOrigin: string): string[] {
  return parseAllowedOrigins(corsOrigin);
}
