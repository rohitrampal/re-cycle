import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_SECRET = 'change-me-in-production';
const corsOriginRaw = process.env.CORS_ORIGIN || 'http://localhost:3000';

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',
  logLevel: (process.env.LOG_LEVEL || 'info') as 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace',

  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'educycle',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 20, // Connection pool size
  },

  // Redis (for caching and rate limiting)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // JWT
  jwtSecret: process.env.JWT_SECRET || DEFAULT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',

  // Cookie
  cookieSecret: process.env.COOKIE_SECRET || DEFAULT_SECRET,

  // CORS & CSRF
  corsOrigin: corsOriginRaw,
  allowedOrigins: corsOriginRaw.split(',').map((o) => o.trim()).filter(Boolean),

  // File upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB

  // AWS S3 (required)
  s3: {
    region: process.env.AWS_REGION || '',
    bucket: process.env.AWS_S3_BUCKET || '',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    cdnUrl: process.env.AWS_CDN_URL || '', // Optional CDN URL (CloudFront)
  },

  // Google Maps API (optional, for geocoding and place search)
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  },
};

/**
 * Validate config for production: require non-default secrets and safe values.
 */
export function validateProductionConfig(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const errors: string[] = [];
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_SECRET) {
    errors.push('JWT_SECRET must be set to a secure value in production');
  }
  if (!process.env.COOKIE_SECRET || process.env.COOKIE_SECRET === DEFAULT_SECRET) {
    errors.push('COOKIE_SECRET must be set to a secure value in production');
  }
  if (!config.database.password || config.database.password.length < 8) {
    errors.push('DB_PASSWORD must be set and at least 8 characters in production');
  }
  if (!config.corsOrigin || config.corsOrigin.includes('*')) {
    errors.push('CORS_ORIGIN must be set to your production frontend origin(s); do not use wildcard (*)');
  }
  if (errors.length > 0) {
    throw new Error(`Production config invalid: ${errors.join('; ')}`);
  }
}
