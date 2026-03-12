import { AppError, ErrorCode } from './errors.js';

/** Allowed S3 key prefixes (no trailing slash in pattern; key may have subpaths like listings/thumbnails/) */
const ALLOWED_KEY_PREFIXES = ['listings/', 'avatars/', 'uploads/'];

/**
 * Validate S3 key to prevent path traversal and restrict to allowed prefixes.
 * Rejects: '..', leading slash, empty, or keys outside allowed folders.
 */
export function validateS3Key(key: string): void {
  if (!key || typeof key !== 'string') {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid file key', 400);
  }
  const trimmed = key.trim();
  if (trimmed.length === 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid file key', 400);
  }
  if (trimmed.includes('..') || trimmed.startsWith('/')) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid file key', 400);
  }
  const hasAllowedPrefix = ALLOWED_KEY_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
  if (!hasAllowedPrefix) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid file key', 400);
  }
}
