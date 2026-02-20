import { AppError, ErrorCode } from './errors';
import { FILE_UPLOAD } from '../constants';

/**
 * Validate uploaded file
 */
export function validateFile(buffer: Buffer, filename: string): void {
  // Check file size
  if (buffer.length > FILE_UPLOAD.MAX_SIZE) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      `File size exceeds maximum of ${FILE_UPLOAD.MAX_SIZE / 1024 / 1024}MB`,
      400
    );
  }

  // Check file extension
  const extension = filename.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  
  if (!extension || !allowedExtensions.includes(extension)) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      `Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`,
      400
    );
  }
}

/**
 * Validate MIME type from buffer
 */
export async function validateMimeType(buffer: Buffer): Promise<void> {
  // Check magic numbers
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isWebp =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  if (!isJpeg && !isPng && !isWebp) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'Invalid file type. Only JPEG, PNG, and WebP images are allowed',
      400
    );
  }
}
