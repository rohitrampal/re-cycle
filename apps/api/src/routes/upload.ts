import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../middleware/auth';
import { s3Service } from '../services/s3.service';
import { AppError, ErrorCode } from '../utils/errors';
import { FILE_UPLOAD } from '../constants';
import { createIpRateLimitMiddleware } from '../utils/ip-rate-limit';

export default async function uploadRoutes(fastify: FastifyInstance) {
  // IP-based rate limiting for uploads (DoS protection)
  const uploadRateLimit = createIpRateLimitMiddleware('upload', 10, 60 * 1000); // 10 uploads per minute per IP

  /**
   * Upload listing images
   * POST /api/upload/listings
   */
  fastify.post(
    '/listings',
    {
      preHandler: [uploadRateLimit, authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = await request.file();

      if (!data) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'No file provided', 400);
      }

      const buffer = await data.toBuffer();

      // Upload to S3 with resizing and thumbnail
      const result = await s3Service.uploadImage(buffer, data.filename, {
        folder: 'listings',
        resize: {
          width: 1200,
          height: 1200,
          quality: 85,
        },
        generateThumbnail: true,
      });

      return {
        success: true,
        data: {
          url: result.url,
          thumbnailUrl: result.thumbnailUrl,
        },
      };
    }
  );

  /**
   * Upload multiple listing images
   * POST /api/upload/listings/multiple
   * Uses req.files() iterator so multiple parts with the same field name are read correctly.
   */
  fastify.post(
    '/listings/multiple',
    {
      preHandler: [uploadRateLimit, authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const fileBuffers: Array<{ buffer: Buffer; filename: string }> = [];
      const parts = request.files();
      let partIndex = 0;
      for await (const part of parts) {
        if (partIndex >= FILE_UPLOAD.MAX_FILES) {
          throw new AppError(
            ErrorCode.VALIDATION_ERROR,
            `Maximum ${FILE_UPLOAD.MAX_FILES} files allowed`,
            400
          );
        }
        const buffer = await part.toBuffer();
        const filename = part.filename || `image-${Date.now()}-${partIndex}.jpg`;
        if (buffer.length === 0) {
          throw new AppError(
            ErrorCode.VALIDATION_ERROR,
            `File "${filename}" is empty. Please upload valid image files (JPEG, PNG, or WebP).`,
            400
          );
        }
        fileBuffers.push({ buffer, filename });
        partIndex += 1;
      }

      if (fileBuffers.length === 0) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'No files provided', 400);
      }

      // Upload to S3
      const results = await s3Service.uploadImages(fileBuffers, {
        folder: 'listings',
        resize: {
          width: 1200,
          height: 1200,
          quality: 85,
        },
        generateThumbnail: true,
      });

      return {
        success: true,
        data: {
          urls: results.map((r) => ({
            url: r.url,
            thumbnailUrl: r.thumbnailUrl,
          })),
        },
      };
    }
  );

  /**
   * Upload user avatar
   * POST /api/upload/avatar
   */
  fastify.post(
    '/avatar',
    {
      preHandler: [uploadRateLimit, authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = await request.file();

      if (!data) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'No file provided', 400);
      }

      const buffer = await data.toBuffer();
      const userId = (request.user as { id: string }).id;

      // Upload to S3 with square crop for avatar
      const result = await s3Service.uploadImage(buffer, data.filename, {
        folder: 'avatars',
        resize: {
          width: 400,
          height: 400,
          quality: 90,
        },
      });

      return {
        success: true,
        data: {
          url: result.url,
        },
      };
    }
  );

  /**
   * Delete file from S3
   * DELETE /api/upload/:key
   */
  fastify.delete(
    '/:key',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { key } = request.params as { key: string };

      // Decode URL-encoded key
      const decodedKey = decodeURIComponent(key);

      await s3Service.deleteFile(decodedKey);

      return {
        success: true,
      };
    }
  );
}
