import crypto from 'crypto';

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate CSRF token using Double Submit Cookie pattern
 * Both cookie token and header token must match
 */
export function validateCsrfToken(token: string, cookieToken: string): boolean {
  if (!token || !cookieToken) return false;
  // Tokens must be 64 characters (32 bytes hex encoded)
  if (token.length !== 64 || cookieToken.length !== 64) return false;
  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(token, 'hex'),
    Buffer.from(cookieToken, 'hex')
  );
}
