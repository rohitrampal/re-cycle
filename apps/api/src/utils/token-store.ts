import crypto from 'crypto';
import { db } from '../database/improved';

/**
 * Hash a refresh token for storage (we never store plaintext).
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Parse JWT expires_in (e.g. '7d') to Date.
 */
function expiresAtFromNow(expiresIn: string): Date {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [, num, unit] = match;
  const n = parseInt(num!, 10);
  const multipliers: Record<string, number> = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return new Date(Date.now() + n * (multipliers[unit!] ?? 86400000));
}

/**
 * Store a refresh token (by hash) for the user.
 */
export async function storeRefreshToken(
  userId: string,
  token: string,
  expiresIn: string = '7d'
): Promise<void> {
  const tokenHash = hashRefreshToken(token);
  const expiresAt = expiresAtFromNow(expiresIn);
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
}

/**
 * Check if the token exists and is not blacklisted. Returns user_id if valid.
 */
export async function validateRefreshToken(token: string): Promise<string | null> {
  const tokenHash = hashRefreshToken(token);
  const blacklisted = await db.query(
    `SELECT 1 FROM refresh_token_blacklist WHERE token_hash = $1 AND expires_at > NOW()`,
    [tokenHash]
  );
  if (blacklisted.rows.length > 0) return null;

  const row = await db.query(
    `SELECT user_id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()`,
    [tokenHash]
  );
  return row.rows[0]?.user_id ?? null;
}

/**
 * Revoke a refresh token by adding it to the blacklist.
 */
export async function revokeRefreshToken(token: string, userId: string, expiresAt: Date): Promise<void> {
  const tokenHash = hashRefreshToken(token);
  await db.query(
    `INSERT INTO refresh_token_blacklist (token_hash, user_id, expires_at) VALUES ($1, $2, $3)
     ON CONFLICT (token_hash) DO NOTHING`,
    [tokenHash, userId, expiresAt]
  );
  await db.query(`DELETE FROM refresh_tokens WHERE token = $1`, [tokenHash]);
}

/**
 * Optional: clean expired tokens from refresh_tokens table (can be run periodically).
 */
export async function cleanExpiredRefreshTokens(): Promise<void> {
  await db.query(`DELETE FROM refresh_tokens WHERE expires_at < NOW()`);
}
