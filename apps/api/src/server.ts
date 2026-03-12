import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { config, validateProductionConfig } from './config.js';
import { db } from './database/improved.js';
import { RATE_LIMITS } from './constants/index.js';
import { getMetrics } from './utils/metrics.js';
import { getCacheBackend } from './services/cache.service.js';
import fp from 'fastify-plugin';
import validationPlugin from './plugins/validation.js';
import errorHandlerPlugin from './plugins/error-handler.js';
import requestLoggerPlugin, { errSerializer } from './plugins/request-logger.js';
import csrfPlugin from './plugins/csrf.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import listingRoutes from './routes/listings.js';
import locationRoutes from './routes/location.js';
import institutionRoutes from './routes/institutions.js';
import uploadRoutes from './routes/upload.js';
import searchAlertRoutes from './routes/search-alerts.js';
import notificationRoutes from './routes/notifications.js';
import geocodingRoutes from './routes/geocoding.js';

const server = Fastify({
  bodyLimit: 1024 * 1024, // 1MB JSON body limit
  logger: {
    level: config.logLevel,
    serializers: {
      err: errSerializer,
    },
    transport: config.isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  },
});

// Security plugins
server.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: config.isProduction
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
});

server.register(cors, {
  origin: config.corsOrigin,
  credentials: true,
});

// Global rate limiting (per-user, not per-IP)
server.register(rateLimit, {
  max: RATE_LIMITS.GENERAL.max,
  timeWindow: RATE_LIMITS.GENERAL.timeWindow,
  // Note: IP-based rate limiting is handled per-route for DoS protection
});

// JWT & Cookie
server.register(jwt, {
  secret: config.jwtSecret,
  cookie: {
    cookieName: 'refreshToken',
    signed: false,
  },
});

server.register(cookie, {
  secret: config.cookieSecret,
  parseOptions: {},
});

// CSRF: validate Origin/Referer for state-changing requests
server.register(csrfPlugin, { allowedOrigins: config.allowedOrigins });

// Validation plugin: wrap with fastify-plugin so it runs in root context and decorates the root.
// Otherwise register() runs it in a child context and route plugins (users, listings, etc.) never see .validate.
server.register(fp(validationPlugin));

server.register(errorHandlerPlugin);
server.register(requestLoggerPlugin);

// Authentication decorator
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

server.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});

// Multipart for file uploads
server.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5,
  },
});

// CSRF token endpoint: returns token in body so cross-origin frontends can send it in header
server.get('/api/csrf-token', async (_, reply) => {
  const { generateCsrfToken } = await import('./utils/csrf.js');
  const token = generateCsrfToken();
  reply.setCookie('XSRF-TOKEN', token, {
    httpOnly: false,
    secure: config.isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60,
  });
  return { csrfToken: token };
});

// Health check
server.get('/health', async () => {
  const dbHealth = await db.healthCheck();
  return {
    status: dbHealth.healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: {
      healthy: dbHealth.healthy,
      latency: dbHealth.latency,
    },
    pool: db.getPoolStats(),
  };
});

// Metrics (in production require METRICS_API_KEY query param if set)
server.get('/metrics', async (request, reply) => {
  const metricsKey = process.env.METRICS_API_KEY;
  if (config.isProduction && metricsKey) {
    const provided = (request.query as { key?: string })?.key;
    if (provided !== metricsKey) {
      return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Invalid metrics key' } });
    }
  }
  const dbHealth = await db.healthCheck();
  return {
    timestamp: new Date().toISOString(),
    database: {
      healthy: dbHealth.healthy,
      latency: dbHealth.latency,
      pool: db.getPoolStats(),
      circuitBreaker: db.getCircuitBreakerStats(),
    },
    cache: getCacheBackend(),
    app: getMetrics(),
  };
});

// API routes (auth with stricter rate limit: 5 per 15 min)
// Root has .validate (via fp(validationPlugin)); this scope's instance inherits it.
server.register(
  async (instance) => {
    await instance.register(rateLimit, {
      max: RATE_LIMITS.AUTH.max,
      timeWindow: RATE_LIMITS.AUTH.timeWindow,
    });
    await instance.register(authRoutes);
  },
  { prefix: '/api/auth' }
);

server.register(userRoutes, { prefix: '/api/users' });
server.register(listingRoutes, { prefix: '/api/listings' });
server.register(locationRoutes, { prefix: '/api/location' });
server.register(institutionRoutes, { prefix: '/api/institutions' });
server.register(uploadRoutes, { prefix: '/api/upload' });
server.register(searchAlertRoutes, { prefix: '/api/search-alerts' });
server.register(notificationRoutes, { prefix: '/api/notifications' });
server.register(geocodingRoutes, { prefix: '/api/geocoding' });

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  server.log.info(`${signal} received, starting graceful shutdown`);
  try {
    await server.close();
    await db.close();
    server.log.info('Graceful shutdown completed');
    process.exit(0);
  } catch (err) {
    server.log.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const start = async () => {
  try {
    validateProductionConfig();
    server.log.info('S3 configuration validated');

    await db.connect();
    server.log.info('Database connected');

    await server.listen({ port: config.port, host: config.host });
    server.log.info(`Server listening on ${config.host}:${config.port}`);
  } catch (err) {
    server.log.error(err);
    if (err instanceof Error && err.message.includes('Cannot connect to PostgreSQL')) {
      server.log.info('Tip: Start Postgres with "docker-compose up -d postgres" or ensure PostgreSQL is running and .env DB_* vars are correct.');
    }
    process.exit(1);
  }
};

start();

export default server;
