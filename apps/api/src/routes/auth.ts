import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../database/improved.js';
import { hashPassword, verifyPassword } from '../utils/auth';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../schemas/auth.schema';
import { AppError, ErrorCode } from '../utils/errors';
import { sanitizeText } from '../utils/sanitize';
import { authenticate } from '../middleware/auth';
import {
  storeRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
} from '../utils/token-store';

export default async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post(
    '/register',
    {
      preHandler: [fastify.validate(registerSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, password, name, phone } = request.body as {
        email: string;
        password: string;
        name: string;
        phone?: string;
      };

    // Sanitize inputs
    const sanitizedEmail = sanitizeText(email.toLowerCase().trim());
    const sanitizedName = sanitizeText(name.trim());
    const sanitizedPhone = phone ? sanitizeText(phone.trim()) : null;

    // Check if user exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [sanitizedEmail]);
    if (existingUser.rows.length > 0) {
      throw new AppError(ErrorCode.ALREADY_EXISTS, 'User already exists', 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const result = await db.query(
      `INSERT INTO users (email, password_hash, name, phone, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, email, name, phone, created_at`,
      [sanitizedEmail, hashedPassword, sanitizedName, sanitizedPhone]
    );

    const user = result.rows[0];
    const accessToken = fastify.jwt.sign(
      { id: user.id },
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
    const refreshExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
    const refreshToken = fastify.jwt.sign(
      { id: user.id },
      { expiresIn: refreshExpiresIn }
    );
    await storeRefreshToken(user.id, refreshToken, refreshExpiresIn);

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // Always strict to prevent CSRF attacks
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
        },
        accessToken,
        refreshToken,
      },
    };
  });

  // Login
  fastify.post(
    '/login',
    {
      preHandler: [fastify.validate(loginSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, password } = request.body as { email: string; password: string };

    // Sanitize email
    const sanitizedEmail = sanitizeText(email.toLowerCase().trim());

    // Check for brute force attempts
    const isLocked = await db.query('SELECT is_email_locked($1) as locked', [sanitizedEmail]);
    if (isLocked.rows[0]?.locked) {
      throw new AppError(
        ErrorCode.RATE_LIMIT_EXCEEDED,
        'Too many failed login attempts. Please try again later.',
        429
      );
    }

    // Only select necessary fields (not password_hash initially)
    const result = await db.query(
      'SELECT id, email, password_hash, name, phone FROM users WHERE email = $1',
      [sanitizedEmail]
    );
    
    if (result.rows.length === 0) {
      // Log failed attempt
      await db.query(
        'INSERT INTO login_attempts (email, success) VALUES ($1, FALSE)',
        [sanitizedEmail]
      );
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    const user = result.rows[0];
    const isValid = await verifyPassword(password, user.password_hash);
    
    if (!isValid) {
      // Log failed attempt
      await db.query(
        'INSERT INTO login_attempts (email, success) VALUES ($1, FALSE)',
        [sanitizedEmail]
      );
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    // Log successful attempt
    await db.query(
      'INSERT INTO login_attempts (email, success) VALUES ($1, TRUE)',
      [sanitizedEmail]
    );

    const accessToken = fastify.jwt.sign(
      { id: user.id },
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
    const refreshExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
    const refreshToken = fastify.jwt.sign(
      { id: user.id },
      { expiresIn: refreshExpiresIn }
    );
    await storeRefreshToken(user.id, refreshToken, refreshExpiresIn);

    // Set refresh token as HTTP-only cookie
    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // Always strict to prevent CSRF attacks
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
        },
        accessToken,
        refreshToken,
      },
    };
  });

  // Get current user
  fastify.get('/me', { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const userId = (request.user as { id: string }).id;
    const result = await db.query('SELECT id, email, name, phone FROM users WHERE id = $1', [userId]);
    return {
      success: true,
      data: result.rows[0],
    };
  });

  // Refresh token (with token rotation)
  fastify.post(
    '/refresh',
    {
      preHandler: [fastify.validate(refreshTokenSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { refreshToken } = request.body as { refreshToken?: string };
      const token = refreshToken || request.cookies.refreshToken;

      if (!token) {
        return reply.code(401).send({
          success: false,
          error: { code: 'NO_TOKEN', message: 'Refresh token required' },
        });
      }

      const userId = await validateRefreshToken(token);
      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid or revoked refresh token' },
        });
      }

      let decoded: { id: string; exp: number };
      try {
        decoded = fastify.jwt.verify(token) as { id: string; exp: number };
      } catch {
        return reply.code(401).send({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' },
        });
      }

      const expiresAt = new Date(decoded.exp * 1000);

      // CRITICAL SECURITY FIX: Revoke old refresh token (token rotation)
      await revokeRefreshToken(token, userId, expiresAt);

      // Generate new access token
      const accessToken = fastify.jwt.sign(
        { id: userId },
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      // CRITICAL SECURITY FIX: Generate NEW refresh token (token rotation)
      const refreshExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
      const newRefreshToken = fastify.jwt.sign(
        { id: userId },
        { expiresIn: refreshExpiresIn }
      );

      // Store new refresh token
      await storeRefreshToken(userId, newRefreshToken, refreshExpiresIn);

      // Set new refresh token in cookie
      reply.setCookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict', // Always strict to prevent CSRF attacks
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return {
        success: true,
        data: {
          accessToken,
          refreshToken: newRefreshToken, // Return new token for client-side storage if needed
        },
      };
    }
  );

  // Logout
  fastify.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const token =
      (request.body as { refreshToken?: string })?.refreshToken ||
      request.cookies.refreshToken;
    if (token) {
      try {
        const decoded = fastify.jwt.verify(token) as { id: string; exp: number };
        const expiresAt = new Date(decoded.exp * 1000);
        await revokeRefreshToken(token, decoded.id, expiresAt);
      } catch {
        // ignore invalid token on logout
      }
    }
    reply.clearCookie('refreshToken');
    return { success: true };
  });
}
