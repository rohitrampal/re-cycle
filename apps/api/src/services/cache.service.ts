/**
 * Optional Redis cache with in-memory fallback.
 * Use REDIS_URL or REDIS_HOST to enable Redis; otherwise in-memory.
 */

import Redis from 'ioredis';
import { config } from '../config.js';
import { CACHE_TTL } from '../constants/index.js';

type CacheBackend = 'redis' | 'memory';

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

let redis: Redis | null = null;
const memoryStore = new Map<string, MemoryEntry>();

function getRedisClient(): Redis | null {
  if (redis) return redis;
  const url = process.env.REDIS_URL;
  if (url) {
    try {
      redis = new Redis(url, { maxRetriesPerRequest: 2 });
      redis.on('error', () => {});
      return redis;
    } catch {
      return null;
    }
  }
  if (config.redis?.host) {
    try {
      redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        maxRetriesPerRequest: 2,
      });
      redis.on('error', () => {});
      return redis;
    } catch {
      return null;
    }
  }
  return null;
}

export function getCacheBackend(): CacheBackend {
  return getRedisClient() ? 'redis' : 'memory';
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (client) {
    try {
      const raw = await client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }
  const entry = memoryStore.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    if (entry) memoryStore.delete(key);
    return null;
  }
  return JSON.parse(entry.value) as T;
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = CACHE_TTL.MEDIUM
): Promise<void> {
  const serialized = JSON.stringify(value);
  const client = getRedisClient();
  if (client) {
    try {
      await client.setex(key, ttlSeconds, serialized);
    } catch {
      // ignore
    }
    return;
  }
  memoryStore.set(key, {
    value: serialized,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function cacheDel(key: string): Promise<void> {
  const client = getRedisClient();
  if (client) {
    try {
      await client.del(key);
    } catch {
      // ignore
    }
    return;
  }
  memoryStore.delete(key);
}

export function cacheKey(prefix: string, ...parts: string[]): string {
  return [prefix, ...parts].join(':');
}
