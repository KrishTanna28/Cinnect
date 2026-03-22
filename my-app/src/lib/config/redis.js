import { Redis } from '@upstash/redis'

let redisClient = null
let redisUnavailableLogged = false

export function getRedisClient() {
  if (redisClient !== null) {
    return redisClient
  }

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    if (!redisUnavailableLogged && process.env.NODE_ENV !== 'production') {
      console.log('[CACHE] Upstash Redis not configured, falling back to local cache')
      redisUnavailableLogged = true
    }
    redisClient = undefined
    return redisClient
  }

  redisClient = new Redis({ url, token })
  return redisClient
}

export function isRedisConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}
