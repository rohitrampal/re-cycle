import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { config } from '../config.js';
import { AppError, ErrorCode } from '../utils/errors.js';
import { FILE_UPLOAD } from '../constants/index.js';
import { validateFile, validateMimeType } from '../utils/file-validator.js';

export interface UploadOptions {
  folder?: string;
  resize?: {
    width?: number;
    height?: number;
    quality?: number;
  };
  generateThumbnail?: boolean;
}

export interface UploadResult {
  url: string;
  key: string;
  thumbnailUrl?: string;
  thumbnailKey?: string;
}

class S3Service {
  private client: S3Client;
  private bucket: string;
  private region: string;
  private readonly baseUrl: string;

  constructor() {
    // Validate S3 configuration on startup
    const missingConfig = [];
    if (!config.s3.region) missingConfig.push('AWS_REGION');
    if (!config.s3.bucket) missingConfig.push('AWS_S3_BUCKET');
    if (!config.s3.accessKeyId) missingConfig.push('AWS_ACCESS_KEY_ID');
    if (!config.s3.secretAccessKey) missingConfig.push('AWS_SECRET_ACCESS_KEY');

    if (missingConfig.length > 0) {
      throw new Error(
        `S3 configuration is required. Missing: ${missingConfig.join(', ')}. ` +
        'Please set these environment variables in your .env file.'
      );
    }

    this.client = new S3Client({
      region: config.s3.region,
      credentials: {
        accessKeyId: config.s3.accessKeyId!,
        secretAccessKey: config.s3.secretAccessKey!,
      },
    });

    this.bucket = config.s3.bucket;
    this.region = config.s3.region;
    // Use CDN URL if provided, otherwise use S3 direct URL. Strip trailing slash to avoid double slashes in built URLs.
    const rawBase = config.s3.cdnUrl || `https://${this.bucket}.s3.${this.region}.amazonaws.com`;
    this.baseUrl = rawBase.replace(/\/+$/, '') || rawBase;
  }

  /**
   * Upload image to S3 with optional resizing and thumbnail generation
   */
  async uploadImage(
    file: Buffer,
    filename: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      // Validate file (size + extension)
      validateFile(file, filename);

      // Validate MIME: try Sharp first (accepts more valid images e.g. JPEG with EXIF), fallback to magic bytes
      const sharpFormat = await this.detectFormatWithSharp(file);
      let mimeType: string;
      if (sharpFormat) {
        if (!['jpeg', 'png', 'webp'].includes(sharpFormat)) {
          throw new AppError(
            ErrorCode.VALIDATION_ERROR,
            'Invalid file type. Only JPEG, PNG, and WebP images are allowed',
            400
          );
        }
        mimeType = sharpFormat === 'jpeg' ? 'image/jpeg' : sharpFormat === 'png' ? 'image/png' : 'image/webp';
      } else {
        await validateMimeType(file);
        mimeType = await this.detectMimeType(file);
      }

      const folder = options.folder || 'uploads';
      const timestamp = Date.now();
      const sanitizedFilename = this.sanitizeFilename(filename);
      const key = `${folder}/${timestamp}-${sanitizedFilename}`;

      // Process image with Sharp
      let processedImage = sharp(file);
      let finalMimeType = mimeType;

      // Resize if options provided
      if (options.resize) {
        processedImage = processedImage.resize(
          options.resize.width,
          options.resize.height,
          {
            fit: 'inside',
            withoutEnlargement: true,
          }
        );

        // Convert to JPEG for consistency and better compression
        processedImage = processedImage.jpeg({ quality: options.resize.quality || 85 });
        finalMimeType = 'image/jpeg';
      }

      // Convert to buffer
      const processedBuffer = await processedImage.toBuffer();

      // Upload main image
      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: processedBuffer,
        ContentType: finalMimeType,
        CacheControl: 'max-age=31536000', // 1 year
        // Note: ACL is deprecated, use bucket policy for public access
      });

      await this.client.send(uploadCommand);

      const url = `${this.baseUrl}/${key}`;
      const result: UploadResult = { url, key };

      // Generate thumbnail if requested
      if (options.generateThumbnail) {
        const thumbnailBuffer = await sharp(file)
          .resize(300, 300, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 80 })
          .toBuffer();

        const thumbnailKey = `${folder}/thumbnails/${timestamp}-${sanitizedFilename}`;
        const thumbnailCommand = new PutObjectCommand({
          Bucket: this.bucket,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: 'image/jpeg',
          CacheControl: 'max-age=31536000',
          // Note: ACL is deprecated, use bucket policy for public access
        });

        await this.client.send(thumbnailCommand);
        result.thumbnailUrl = `${this.baseUrl}/${thumbnailKey}`;
        result.thumbnailKey = thumbnailKey;
      }

      return result;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        `Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Upload multiple images
   */
  async uploadImages(
    files: Array<{ buffer: Buffer; filename: string }>,
    options: UploadOptions = {}
  ): Promise<UploadResult[]> {
    if (files.length > FILE_UPLOAD.MAX_FILES) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Maximum ${FILE_UPLOAD.MAX_FILES} files allowed`,
        400
      );
    }

    const uploadPromises = files.map((file) =>
      this.uploadImage(file.buffer, file.filename, options)
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
    } catch (error) {
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Delete multiple files from S3
   */
  async deleteFiles(keys: string[]): Promise<void> {
    const deletePromises = keys.map((key) => this.deleteFile(key));
    await Promise.allSettled(deletePromises);
  }

  /**
   * Generate presigned URL for temporary access
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        `Failed to generate presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Extract S3 key from URL
   */
  extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      if (!pathname || pathname === '/') {
        return null;
      }

      // Remove leading slash
      return pathname.substring(1);
    } catch {
      return null;
    }
  }

  /**
   * Get thumbnail key from main image key (listings/123-foo.jpg -> listings/thumbnails/123-foo.jpg)
   */
  getThumbnailKey(mainKey: string): string {
    const parts = mainKey.split('/');
    if (parts.length < 2) return mainKey;
    const filename = parts.pop()!;
    parts.push('thumbnails', filename);
    return parts.join('/');
  }

  /**
   * Try to detect image format using Sharp (accepts more valid images than magic bytes alone).
   * Returns format string (e.g. 'jpeg', 'png', 'webp') or null if Sharp cannot read the file.
   */
  private async detectFormatWithSharp(buffer: Buffer): Promise<string | null> {
    try {
      const metadata = await sharp(buffer).metadata();
      return metadata.format ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Detect MIME type from buffer
   */
  private async detectMimeType(buffer: Buffer): Promise<string> {
    // Check magic numbers
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return 'image/png';
    }
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return 'image/webp';
    }

    // Default to jpeg if cannot detect
    return 'image/jpeg';
  }

  /**
   * Sanitize filename
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }
}

export const s3Service = new S3Service();
