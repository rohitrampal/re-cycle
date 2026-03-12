import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../database/improved.js';
import { getUserSchema, updateUserProfileSchema } from '../schemas/user.schema.js';
import { authenticate } from '../middleware/auth.js';
import { AppError, ErrorCode } from '../utils/errors.js';

export default async function userRoutes(fastify: FastifyInstance) {
  // Get user profile
  fastify.get(
    '/:id',
    {
      preHandler: [fastify.validate(getUserSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const result = await db.query(
        `SELECT id, email, name, phone, created_at, updated_at 
         FROM users WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        });
      }

      return {
        success: true,
        data: result.rows[0],
      };
    }
  );

  // Update own profile
  fastify.patch(
    '/me',
    {
      preHandler: [authenticate, fastify.validate(updateUserProfileSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as { id: string }).id;
      const updates = request.body as Partial<{ name: string; phone: string; bio?: string; institutionId?: string }>;

      // Build update query safely using parameterized queries
      const updateFields: string[] = [];
      const values: unknown[] = [];
      let paramCount = 1;

      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        values.push(updates.name);
      }
      if (updates.phone !== undefined) {
        updateFields.push(`phone = $${paramCount++}`);
        values.push(updates.phone);
      }
      if (updates.bio !== undefined) {
        updateFields.push(`bio = $${paramCount++}`);
        values.push(updates.bio);
      }
      if (updates.institutionId !== undefined) {
        updateFields.push(`institution_id = $${paramCount++}`);
        values.push(updates.institutionId);
      }

      if (updateFields.length === 0) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'No fields to update', 400);
      }

      // Add updated_at
      updateFields.push(`updated_at = NOW()`);
      // Add userId as last parameter
      values.push(userId);

      const result = await db.query(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING id, email, name, phone, bio, institution_id, created_at, updated_at`,
        values
      );

      if (result.rows.length === 0) {
        throw new AppError(ErrorCode.NOT_FOUND, 'User not found', 404);
      }

      return {
        success: true,
        data: result.rows[0],
      };
    }
  );
}
