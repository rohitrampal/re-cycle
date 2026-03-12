import { FastifyInstance, FastifyRequest } from 'fastify';
import { db } from '../database/improved.js';
import { authenticate } from '../middleware/auth';
import { getNotificationsSchema, notificationIdSchema } from '../schemas/notification.schema';
import { AppError, ErrorCode } from '../utils/errors';

export default async function notificationRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    {
      preHandler: [authenticate, fastify.validate(getNotificationsSchema)],
    },
    async (request: FastifyRequest) => {
      const userId = (request.user as { id: string }).id;
      const { page = 1, limit = 20, unreadOnly } = (request.query as {
        page?: number;
        limit?: number;
        unreadOnly?: boolean;
      }) ?? {};
      const limitNum = Math.min(Math.max(1, limit), 100);
      const offset = (Math.max(1, page) - 1) * limitNum;
      const conditions = ['user_id = $1'];
      const params: unknown[] = [userId];
      if (unreadOnly) {
        conditions.push('read_at IS NULL');
      }
      const countResult = await db.query(
        `SELECT COUNT(*)::int AS total FROM notifications WHERE ${conditions.join(' AND ')}`,
        params
      );
      const total = countResult.rows[0]?.total ?? 0;
      const limitParam = params.length + 1;
      const offsetParam = params.length + 2;
      params.push(limitNum, offset);
      const result = await db.query(
        `SELECT id, user_id, type, reference_id, title, message, read_at, created_at
         FROM notifications
         WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC
         LIMIT $${limitParam} OFFSET $${offsetParam}`,
        params
      );
      const totalPages = Math.ceil(total / limitNum);
      return {
        success: true,
        data: {
          data: result.rows,
          pagination: {
            page: Math.max(1, page),
            limit: limitNum,
            total,
            totalPages,
            hasMore: page < totalPages,
          },
        },
      };
    }
  );

  fastify.patch(
    '/:id/read',
    {
      preHandler: [authenticate, fastify.validate(notificationIdSchema)],
    },
    async (request: FastifyRequest) => {
      const userId = (request.user as { id: string }).id;
      const { id } = request.params as { id: string };
      const result = await db.query(
        `UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING id, read_at`,
        [id, userId]
      );
      if (result.rows.length === 0) {
        throw new AppError(ErrorCode.NOT_FOUND, 'Notification not found', 404);
      }
      return { success: true, data: result.rows[0] };
    }
  );

  fastify.patch(
    '/read-all',
    { preHandler: [authenticate] },
    async (request: FastifyRequest) => {
      const userId = (request.user as { id: string }).id;
      await db.query(
        'UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL',
        [userId]
      );
      return { success: true };
    }
  );
}
