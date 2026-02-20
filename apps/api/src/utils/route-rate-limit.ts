/**
 * In-memory rate limit for specific routes (e.g. search) when different from global.
 * Keys are cleared after reset time to avoid unbounded growth.
 */

const store = new Map<string, { count: number; resetAt: number }>();

const SLOP_MS = 1000; // cleanup entries 1s after reset

export function checkRouteRateLimit(
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);
  const resetAt = entry && entry.resetAt > now ? entry.resetAt : now + windowMs;
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: max - 1, resetAt };
  }
  entry.count += 1;
  const allowed = entry.count <= max;
  const remaining = Math.max(0, max - entry.count);
  if (!allowed) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  return { allowed: true, remaining, resetAt: entry.resetAt };
}

export function cleanupExpired(): void {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (v.resetAt + SLOP_MS < now) store.delete(k);
  }
}

// Run cleanup every minute
setInterval(cleanupExpired, 60000);
