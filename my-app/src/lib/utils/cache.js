import NodeCache from 'node-cache';

// Single shared in-memory cache instance
const cache = new NodeCache({ useClones: false });

/**
 * Get a cached value by key. Returns null if not found or expired.
 * @param {string} key
 * @returns {Promise<any>}
 */
export async function get(key) {
  const value = cache.get(key);
  return value !== undefined ? value : null;
}

/**
 * Store a value in the cache.
 * @param {string} key
 * @param {any} value
 * @param {number} ttlSeconds - Time to live in seconds
 */
export async function set(key, value, ttlSeconds = 3600) {
  cache.set(key, value, ttlSeconds);
}

/**
 * Delete a cached entry.
 * @param {string} key
 */
export async function del(key) {
  cache.del(key);
}
