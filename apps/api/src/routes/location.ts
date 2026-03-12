import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../database/improved.js';
import { updateLocationSchema, getNearbyListingsSchema } from '../schemas/location.schema';
import { authenticate } from '../middleware/auth';

export default async function locationRoutes(fastify: FastifyInstance) {
  // Update user location
  fastify.post(
    '/',
    {
      preHandler: [authenticate, fastify.validate(updateLocationSchema)],
    },
    async (request: FastifyRequest) => {
      const userId = (request.user as { id: string }).id;
      const { latitude, longitude } = request.body as { latitude: number; longitude: number };

    // Update user location using PostGIS
    await db.query(
      `UPDATE users 
       SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326), updated_at = NOW()
       WHERE id = $3`,
      [longitude, latitude, userId]
    );

    return { success: true };
  });

  // Get nearby listings
  fastify.get(
    '/nearby',
    {
      preHandler: [authenticate, fastify.validate(getNearbyListingsSchema)],
    },
    async (request: FastifyRequest) => {
      const userId = (request.user as { id: string }).id;
      const { radius = 10, limit = 20 } = request.query as { radius?: number; limit?: number };

    // Get user location
    const userResult = await db.query(
      'SELECT location FROM users WHERE id = $1',
      [userId]
    );

    if (!userResult.rows[0]?.location) {
      return {
        success: false,
        error: { code: 'NO_LOCATION', message: 'User location not set' },
      };
    }

    // Find nearby listings using PostGIS ST_DWithin (optimized with JOIN)
    const result = await db.query(
      `SELECT 
        l.id,
        l.user_id,
        l.title,
        l.description,
        l.category_code,
        l.type,
        l.condition,
        l.price,
        l.images,
        l.institution_id,
        l.is_active,
        l.views,
        l.created_at,
        l.updated_at,
        ST_Distance(l.location::geography, u.location::geography) as distance
       FROM listings l
       INNER JOIN users u ON u.id = $1
       WHERE l.location IS NOT NULL
         AND u.location IS NOT NULL
         AND ST_DWithin(
           l.location::geography,
           u.location::geography,
           $2 * 1000
         )
         AND l.is_active = TRUE
       ORDER BY distance ASC
       LIMIT $3`,
      [userId, radius, limit]
    );

    return {
      success: true,
      data: result.rows,
    };
  });
}
