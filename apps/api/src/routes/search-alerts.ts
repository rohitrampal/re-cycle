import { FastifyInstance, FastifyRequest } from 'fastify';
import { db } from '../database/improved';
import { authenticate } from '../middleware/auth';
import { createSearchAlertSchema, getSearchAlertSchema } from '../schemas/search-alert.schema';
import { AppError, ErrorCode } from '../utils/errors';

export default async function searchAlertRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/',
    {
      preHandler: [authenticate, fastify.validate(createSearchAlertSchema)],
    },
    async (request: FastifyRequest) => {
      const userId = (request.user as { id: string }).id;
      const body = request.body as {
        categoryCode?: string;
        type?: string;
        query?: string;
        latitude: number;
        longitude: number;
        radiusKm?: number;
      };
      const result = await db.query(
        `INSERT INTO search_alerts (user_id, category_code, type, query, location, radius_km)
         VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7)
         RETURNING id, user_id, category_code, type, query, radius_km, created_at`,
        [
          userId,
          body.categoryCode ?? null,
          body.type ?? null,
          body.query ?? null,
          body.longitude,
          body.latitude,
          body.radiusKm ?? 10,
        ]
      );
      return { success: true, data: result.rows[0] };
    }
  );

  fastify.get(
    '/',
    { preHandler: [authenticate] },
    async (request: FastifyRequest) => {
      const userId = (request.user as { id: string }).id;
      const result = await db.query(
        `SELECT id, user_id, category_code, type, query, radius_km, created_at
         FROM search_alerts WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      );
      return { success: true, data: result.rows };
    }
  );

  fastify.delete(
    '/:id',
    {
      preHandler: [authenticate, fastify.validate(getSearchAlertSchema)],
    },
    async (request: FastifyRequest) => {
      const userId = (request.user as { id: string }).id;
      const { id } = request.params as { id: string };
      const result = await db.query(
        'DELETE FROM search_alerts WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, userId]
      );
      if (result.rows.length === 0) {
        throw new AppError(ErrorCode.NOT_FOUND, 'Search alert not found', 404);
      }
      return { success: true };
    }
  );
}
