import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../database/improved';
import {
  createListingSchema,
  updateListingSchema,
  getListingSchema,
  searchListingsSchema,
  getMyListingsSchema,
  deleteListingSchema,
} from '../schemas/listing.schema';
import { createRatingSchema, getListingRatingSchema } from '../schemas/rating.schema';
import { authenticate, authorize } from '../middleware/auth';
import { listingService } from '../services/listing.service';
import { AppError, ErrorCode } from '../utils/errors';
import { RATE_LIMITS } from '../constants';
import { checkRouteRateLimit } from '../utils/route-rate-limit';
import { cacheGet, cacheSet, cacheDel, cacheKey } from '../services/cache.service';
import { s3Service } from '../services/s3.service';
import { CACHE_TTL } from '../constants';
import { notifyMatchingSearchAlerts } from '../services/notification.service';
import { roundForResponse, roundForStorage } from '../utils/location';

export default async function listingRoutes(fastify: FastifyInstance) {
  // Create listing
  fastify.post(
    '/',
    {
      preHandler: [authenticate, fastify.validate(createListingSchema)],
    },
    async (request: FastifyRequest) => {
      const userId = (request.user as { id: string }).id;
      const body = request.body as {
        title: string;
        description?: string;
        categoryCode: string;
        type: string;
        condition?: string;
        price?: number;
        images: string[];
        latitude?: number;
        longitude?: number;
        institutionId?: string;
      };
      const location =
        body.latitude != null && body.longitude != null
          ? { latitude: body.latitude, longitude: body.longitude }
          : null;
      const created = await listingService.create(userId, {
        title: body.title,
        description: body.description ?? '',
        category: body.categoryCode,
        type: body.type,
        condition: body.condition ?? 'good',
        price: body.price,
        images: body.images,
        location,
        institutionId: body.institutionId,
      });
      if (location) {
        setImmediate(() => {
          notifyMatchingSearchAlerts(
            {
              id: created.id,
              user_id: created.userId,
              title: created.title,
              category_code: created.category,
              type: created.type,
              location: null,
            },
            location.longitude,
            location.latitude
          ).catch((err) => fastify.log.warn({ err, listingId: created.id }, 'Notification match failed'));
        });
      }
      return {
        success: true,
        data: {
          id: created.id,
          userId: created.userId,
          title: created.title,
          description: created.description,
          category: created.category,
          type: created.type,
          condition: created.condition,
          price: created.price,
          images: created.images,
          location: roundForResponse(created.location),
          institutionId: created.institutionId,
          isActive: created.isActive,
          views: created.views,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        },
      };
    }
  );

  // Rate a listing (authenticated user)
  fastify.post(
    '/:id/rate',
    {
      preHandler: [authenticate, fastify.validate(createRatingSchema)],
    },
    async (request: FastifyRequest) => {
      const userId = (request.user as { id: string }).id;
      const { id: listingId } = request.params as { id: string };
      const { score, comment } = request.body as { score: number; comment?: string };
      const listingCheck = await db.query('SELECT user_id FROM listings WHERE id = $1', [listingId]);
      if (listingCheck.rows.length === 0) {
        throw new AppError(ErrorCode.NOT_FOUND, 'Listing not found', 404);
      }
      if (listingCheck.rows[0].user_id === userId) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'You cannot rate your own listing', 400);
      }
      await db.query(
        `INSERT INTO listing_ratings (listing_id, user_id, score, comment)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (listing_id, user_id) DO UPDATE SET score = $3, comment = $4`,
        [listingId, userId, score, comment ?? null]
      );
      const summary = await db.query(
        `SELECT COUNT(*)::int AS count, ROUND(AVG(score)::numeric, 2)::float AS average
         FROM listing_ratings WHERE listing_id = $1`,
        [listingId]
      );
      return {
        success: true,
        data: {
          average: summary.rows[0]?.average ?? score,
          count: summary.rows[0]?.count ?? 1,
        },
      };
    }
  );

  // Get listing rating summary (and optionally list of ratings)
  fastify.get(
    '/:id/rating',
    {
      preHandler: [fastify.validate(getListingRatingSchema)],
    },
    async (request: FastifyRequest) => {
      const { id: listingId } = request.params as { id: string };
      const summary = await db.query(
        `SELECT COUNT(*)::int AS count, ROUND(AVG(score)::numeric, 2)::float AS average
         FROM listing_ratings WHERE listing_id = $1`,
        [listingId]
      );
      const list = await db.query(
        `SELECT lr.score, lr.comment, lr.created_at, u.name as user_name
         FROM listing_ratings lr
         JOIN users u ON u.id = lr.user_id
         WHERE lr.listing_id = $1
         ORDER BY lr.created_at DESC
         LIMIT 50`,
        [listingId]
      );
      return {
        success: true,
        data: {
          average: summary.rows[0]?.average ?? null,
          count: summary.rows[0]?.count ?? 0,
          ratings: list.rows.map((r) => ({
            score: r.score,
            comment: r.comment,
            userName: r.user_name,
            createdAt: r.created_at,
          })),
        },
      };
    }
  );

  // Get listing by ID (cached; optional include=user for nested user)
  fastify.get(
    '/:id',
    {
      preHandler: [fastify.validate(getListingSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const includeUser = (request.query as { include?: string })?.include === 'user';

      if (!includeUser) {
        const key = cacheKey('listing', id);
        const cached = await cacheGet<unknown>(key);
        if (cached != null) {
          return { success: true, data: cached };
        }
      }

      if (includeUser) {
        const result = await db.query(
          `SELECT l.id, l.user_id, l.title, l.description, l.category_code, l.type, l.condition, l.price, l.images, l.institution_id, l.is_active, l.views, l.created_at, l.updated_at,
                  ST_Y(l.location::geometry) AS location_lat, ST_X(l.location::geometry) AS location_lng,
                  u.id as u_id, u.name as u_name, u.email as u_email, u.phone as u_phone, u.verified as u_verified
           FROM listings l
           INNER JOIN users u ON u.id = l.user_id
           WHERE l.id = $1 AND l.is_active = TRUE`,
          [id]
        );
        if (result.rows.length === 0) {
          throw new AppError(ErrorCode.NOT_FOUND, 'Listing not found', 404);
        }
        const row = result.rows[0];
        const listing = {
          id: row.id,
          user_id: row.user_id,
          title: row.title,
          description: row.description,
          category_code: row.category_code,
          type: row.type,
          condition: row.condition,
          price: row.price,
          images: row.images,
          institution_id: row.institution_id,
          is_active: row.is_active,
          views: row.views,
          created_at: row.created_at,
          updated_at: row.updated_at,
          location: roundForResponse(
            row.location_lat != null && row.location_lng != null
              ? { latitude: Number(row.location_lat), longitude: Number(row.location_lng) }
              : null
          ),
          user: {
            id: row.u_id,
            name: row.u_name,
            email: row.u_email,
            phone: row.u_phone,
            verified: row.u_verified,
          },
        };
        return { success: true, data: listing };
      }

      const result = await db.query(
        `SELECT id, user_id, title, description, category_code, type, condition, price, images, institution_id, is_active, views, created_at, updated_at,
                ST_Y(location::geometry) AS location_lat, ST_X(location::geometry) AS location_lng
         FROM listings WHERE id = $1 AND is_active = TRUE`,
        [id]
      );
      if (result.rows.length === 0) {
        throw new AppError(ErrorCode.NOT_FOUND, 'Listing not found', 404);
      }
      const row = result.rows[0];
      const location =
        row.location_lat != null && row.location_lng != null
          ? { latitude: Number(row.location_lat), longitude: Number(row.location_lng) }
          : null;
      const listing = {
        ...row,
        location: roundForResponse(location),
      };
      delete (listing as Record<string, unknown>).location_lat;
      delete (listing as Record<string, unknown>).location_lng;
      await cacheSet(cacheKey('listing', id), listing, CACHE_TTL.MEDIUM);
      return { success: true, data: listing };
    }
  );

  // Search listings (stricter rate limit: 30/min)
  fastify.get(
    '/search',
    {
      preHandler: [
        async (request: FastifyRequest, reply: FastifyReply) => {
          const ip = (request as any).ip ?? request.headers['x-forwarded-for'] ?? 'unknown';
          const key = `search:${typeof ip === 'string' ? ip : ip[0] ?? 'unknown'}`;
          const windowMs = 60 * 1000;
          const { allowed, remaining, resetAt } = checkRouteRateLimit(
            key,
            RATE_LIMITS.SEARCH.max,
            windowMs
          );
          reply.header('X-RateLimit-Limit', RATE_LIMITS.SEARCH.max);
          reply.header('X-RateLimit-Remaining', remaining);
          reply.header('X-RateLimit-Reset', Math.ceil(resetAt / 1000));
          if (!allowed) {
            return reply.code(429).send({
              success: false,
              error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many search requests. Try again later.' },
            });
          }
        },
        fastify.validate(searchListingsSchema),
      ],
    },
    async (request: FastifyRequest) => {
      const q = request.query as {
        categoryCode?: string;
        type?: string;
        condition?: string;
        minPrice?: number;
        maxPrice?: number;
        freeOnly?: boolean;
        radius?: number;
        institutionId?: string;
        query?: string;
        limit: number;
        cursorId?: string;
        cursorCreatedAt?: string;
        includeTotal?: boolean;
        latitude?: number;
        longitude?: number;
      };

      const limit = Math.min(q.limit ?? 20, 100);
      const conditions: string[] = ['l.is_active = TRUE'];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (q.categoryCode) {
        conditions.push(`l.category_code = $${paramIndex++}`);
        params.push(q.categoryCode);
      }
      if (q.type) {
        conditions.push(`l.type = $${paramIndex++}`);
        params.push(q.type);
      }
      if (q.condition) {
        conditions.push(`l.condition = $${paramIndex++}`);
        params.push(q.condition);
      }
      if (q.minPrice != null) {
        conditions.push(`l.price >= $${paramIndex++}`);
        params.push(q.minPrice);
      }
      if (q.maxPrice != null) {
        conditions.push(`l.price <= $${paramIndex++}`);
        params.push(q.maxPrice);
      }
      if (q.freeOnly) {
        conditions.push(`l.type = 'free'`);
      }
      if (q.institutionId) {
        conditions.push(`l.institution_id = $${paramIndex++}`);
        params.push(q.institutionId);
      }
      if (q.query?.trim()) {
        conditions.push(`to_tsvector('english', l.title || ' ' || COALESCE(l.description, '')) @@ plainto_tsquery('english', $${paramIndex})`);
        params.push(q.query.trim());
        paramIndex++;
      }
      if (q.radius != null && q.latitude != null && q.longitude != null) {
        conditions.push(
          `ST_DWithin(l.location::geography, ST_SetSRID(ST_MakePoint($${paramIndex}, $${paramIndex + 1}), 4326)::geography, $${paramIndex + 2} * 1000)`
        );
        params.push(q.longitude, q.latitude, q.radius);
        paramIndex += 3;
      }
      if (q.cursorId && q.cursorCreatedAt) {
        conditions.push(`(l.created_at, l.id) < ($${paramIndex}::timestamptz, $${paramIndex + 1}::uuid)`);
        params.push(q.cursorCreatedAt, q.cursorId);
        paramIndex += 2;
      }

      let total: number | undefined;
      if (q.includeTotal) {
        const countResult = await db.query(
          `SELECT COUNT(*)::int AS total FROM listings l WHERE ${conditions.join(' AND ')}`,
          params
        );
        total = countResult.rows[0]?.total ?? 0;
      }

      params.push(limit + 1);
      const result = await db.query(
        `SELECT l.id, l.title, l.description, l.category_code, l.type, l.condition, l.price, l.images, l.created_at, l.user_id
         FROM listings l
         WHERE ${conditions.join(' AND ')}
         ORDER BY l.created_at DESC, l.id DESC
         LIMIT $${paramIndex}`,
        params
      );

      const rows = result.rows;
      const hasMore = rows.length > limit;
      const listings = hasMore ? rows.slice(0, limit) : rows;
      const last = listings[listings.length - 1];
      const nextCursor =
        hasMore && last
          ? {
              cursorId: last.id,
              cursorCreatedAt: new Date((last as { created_at: string }).created_at).toISOString(),
            }
          : null;

      const data: { listings: unknown[]; limit: number; hasMore: boolean; nextCursor: unknown; total?: number } = {
        listings,
        limit,
        hasMore,
        nextCursor,
      };
      if (total !== undefined) data.total = total;
      return { success: true, data };
    }
  );

  // Get my listings
  fastify.get(
    '/me',
    {
      preHandler: [authenticate, fastify.validate(getMyListingsSchema)],
    },
    async (request: FastifyRequest) => {
      const userId = (request.user as { id: string }).id;
      const { page = 1, limit = 20, isActive } = (request.query as {
        page?: number;
        limit?: number;
        isActive?: boolean;
      }) ?? {};
      const limitNum = Math.min(Math.max(1, limit), 100);
      const offset = (Math.max(1, page) - 1) * limitNum;

      const conditions = ['user_id = $1'];
      const params: unknown[] = [userId];
      if (isActive !== undefined) {
        conditions.push('is_active = $2');
        params.push(isActive);
      }
      const countResult = await db.query(
        `SELECT COUNT(*)::int AS total FROM listings WHERE ${conditions.join(' AND ')}`,
        params
      );
      const total = countResult.rows[0]?.total ?? 0;
      const limitParam = params.length + 1;
      const offsetParam = params.length + 2;
      params.push(limitNum, offset);
      const result = await db.query(
        `SELECT id, user_id, title, description, category_code, type, condition, price, images, institution_id, is_active, views, created_at, updated_at
         FROM listings WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC LIMIT $${limitParam} OFFSET $${offsetParam}`,
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

  // Update listing
  fastify.patch(
    '/:id',
    {
      preHandler: [
        authenticate,
        fastify.validate(updateListingSchema),
        authorize(async (req) => {
          const listingId = (req.params as { id: string }).id;
          const userId = (req.user as { id: string }).id;
          const isOwner = await listingService.isOwner(listingId, userId);
          if (!isOwner) {
            throw new AppError(ErrorCode.FORBIDDEN, 'You do not own this listing', 403);
          }
          return userId;
        }),
      ],
    },
    async (request: FastifyRequest) => {
      const { id } = request.params as { id: string };
      const body = request.body as Partial<{
        title: string;
        description: string;
        categoryCode: string;
        type: string;
        condition: string;
        price: number;
        images: string[];
        latitude: number;
        longitude: number;
        clearLocation?: boolean;
        isActive: boolean;
      }>;
      const updateFields: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;
      if (body.title !== undefined) {
        updateFields.push(`title = $${paramIndex++}`);
        values.push(body.title);
      }
      if (body.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(body.description);
      }
      if (body.categoryCode !== undefined) {
        updateFields.push(`category_code = $${paramIndex++}`);
        values.push(body.categoryCode);
      }
      if (body.type !== undefined) {
        updateFields.push(`type = $${paramIndex++}`);
        values.push(body.type);
      }
      if (body.condition !== undefined) {
        updateFields.push(`condition = $${paramIndex++}`);
        values.push(body.condition);
      }
      if (body.price !== undefined) {
        updateFields.push(`price = $${paramIndex++}`);
        values.push(body.price);
      }
      if (body.images !== undefined) {
        updateFields.push(`images = $${paramIndex++}`);
        values.push(body.images);
      }
      if (body.clearLocation === true) {
        updateFields.push('location = NULL');
      } else if (body.latitude !== undefined && body.longitude !== undefined) {
        const rounded = roundForStorage(body.latitude, body.longitude);
        updateFields.push(`location = ST_SetSRID(ST_MakePoint($${paramIndex}, $${paramIndex + 1}), 4326)`);
        values.push(rounded.longitude, rounded.latitude);
        paramIndex += 2;
      }
      if (body.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        values.push(body.isActive);
      }
      if (updateFields.length === 0) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'No fields to update', 400);
      }
      updateFields.push('updated_at = NOW()');
      values.push(id);
      const result = await db.query(
        `UPDATE listings SET ${updateFields.join(', ')} WHERE id = $${paramIndex}
         RETURNING id, user_id, title, description, category_code, type, condition, price, images, institution_id, is_active, views, created_at, updated_at,
           ST_Y(location::geometry) AS location_lat, ST_X(location::geometry) AS location_lng`,
        values
      );
      if (result.rows.length === 0) {
        throw new AppError(ErrorCode.NOT_FOUND, 'Listing not found', 404);
      }
      await cacheDel(cacheKey('listing', id));
      const row = result.rows[0];
      const location =
        row.location_lat != null && row.location_lng != null
          ? { latitude: Number(row.location_lat), longitude: Number(row.location_lng) }
          : null;
      const listing = {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        description: row.description,
        category: row.category_code,
        type: row.type,
        condition: row.condition,
        price: row.price,
        images: row.images,
        institutionId: row.institution_id,
        isActive: row.is_active,
        views: row.views,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        location: roundForResponse(location),
      };
      return { success: true, data: listing };
    }
  );

  // Delete listing
  fastify.delete(
    '/:id',
    {
      preHandler: [
        authenticate,
        fastify.validate(deleteListingSchema),
        authorize(async (req) => {
          const listingId = (req.params as { id: string }).id;
          const userId = (req.user as { id: string }).id;
          const isOwner = await listingService.isOwner(listingId, userId);
          if (!isOwner) {
            throw new AppError(ErrorCode.FORBIDDEN, 'You do not own this listing', 403);
          }
          return userId;
        }),
      ],
    },
    async (request: FastifyRequest) => {
      const { id } = request.params as { id: string };

      // Load listing images so we can delete them from S3 (avoid orphaned blobs)
      const listResult = await db.query(
        'SELECT images FROM listings WHERE id = $1',
        [id]
      );
      const images: string[] = (listResult.rows[0]?.images as string[] | null) ?? [];
      const keysToDelete: string[] = [];
      for (const url of images) {
        if (!url || typeof url !== 'string') continue;
        const key = s3Service.extractKeyFromUrl(url);
        if (key) {
          keysToDelete.push(key);
          keysToDelete.push(s3Service.getThumbnailKey(key));
        }
      }
      if (keysToDelete.length > 0) {
        await s3Service.deleteFiles(keysToDelete);
      }

      await db.query('DELETE FROM listings WHERE id = $1', [id]);
      await cacheDel(cacheKey('listing', id));
      return { success: true };
    }
  );
}
