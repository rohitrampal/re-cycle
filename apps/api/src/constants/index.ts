/**
 * Application-wide constants
 */

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const RATE_LIMITS = {
  AUTH: {
    max: 5, // 5 attempts
    timeWindow: '15 minutes',
  },
  GENERAL: {
    max: 100,
    timeWindow: '1 minute',
  },
  SEARCH: {
    max: 30,
    timeWindow: '1 minute',
  },
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  MIN_SIZE: 100, // Reject empty or truncated uploads (smallest valid JPEG/PNG/WebP is larger)
  MAX_FILES: 5,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

export const QUERY_TIMEOUTS = {
  DEFAULT: 30000, // 30 seconds
  FAST: 5000, // 5 seconds
  SLOW: 60000, // 60 seconds
} as const;

export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;
