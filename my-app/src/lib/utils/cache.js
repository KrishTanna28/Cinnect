import { getRedisClient } from '@/lib/config/redis.js'

export function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }

  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort()
    return `{${keys.map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
  }

  return JSON.stringify(value)
}

function normalizePart(part) {
  if (part === null || part === undefined) return 'null'
  if (typeof part === 'string') return part.trim() || 'empty'
  if (typeof part === 'number' || typeof part === 'boolean') return String(part)
  return stableStringify(part)
}

export function buildCacheKey(namespace, ...parts) {
  return [namespace, ...parts].map(normalizePart).join(':')
}

/**
 * Get a cached value by key. Returns null if not found or expired.
 */
export async function get(key) {
  const redis = getRedisClient()
  if (!redis) return null

  try {
    const value = await redis.get(key)
    return value ?? null
  } catch (error) {
    console.error('[CACHE] Redis get failed:', key, error?.message || error)
    return null
  }
}

/**
 * Store a value in the cache.
 */
export async function set(key, value, ttlSeconds = 3600) {
  const redis = getRedisClient()
  if (!redis) return

  try {
    if (ttlSeconds > 0) {
      await redis.set(key, value, { ex: ttlSeconds })
    } else {
      await redis.set(key, value)
    }
  } catch (error) {
    console.error('[CACHE] Redis set failed:', key, error?.message || error)
  }
}

/**
 * Delete a cached entry.
 */
export async function del(key) {
  const redis = getRedisClient()
  if (!redis) return

  try {
    await redis.del(key)
  } catch (error) {
    console.error('[CACHE] Redis delete failed:', key, error?.message || error)
  }
}

/**
 * Resolve a value from cache or compute it and cache the result.
 */
export async function remember(key, ttlSeconds, producer, options = {}) {
  const { cacheNull = false } = options
  const cached = await get(key)
  if (cached !== null) {
    return cached
  }

  const value = await producer()
  if (value !== null && value !== undefined) {
    await set(key, value, ttlSeconds)
  } else if (cacheNull) {
    await set(key, value, ttlSeconds)
  }

  return value
}
