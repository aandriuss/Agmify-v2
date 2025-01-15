import { debug } from '~/composables/core/utils/debug'
import type { DebugCategories } from '~/composables/core/utils/debug'
import type { RawParameter, ParameterCache } from './types'

// Extend debug categories
const CACHE = 'cache' as DebugCategories

const CACHE_KEY = 'parameter-store-cache'
const CACHE_TTL = 1000 * 60 * 5 // 5 minutes
const CACHE_VERSION = '1.0.0'
const MAX_CACHE_SIZE = 5 * 1024 * 1024 // 5MB

interface CacheEntry {
  data: RawParameter[]
  timestamp: number
  version: string
  size: number
}

/**
 * Check if cache entry is valid
 */
function isValidCacheEntry(entry: unknown): entry is CacheEntry {
  if (!entry || typeof entry !== 'object') return false

  const cacheEntry = entry as CacheEntry
  return (
    Array.isArray(cacheEntry.data) &&
    typeof cacheEntry.timestamp === 'number' &&
    typeof cacheEntry.version === 'string' &&
    typeof cacheEntry.size === 'number'
  )
}

/**
 * Parameter cache implementation
 */
export const parameterCache: ParameterCache = {
  /**
   * Load parameters from cache
   */
  async loadFromCache(): Promise<RawParameter[] | null> {
    try {
      const cached = await Promise.resolve(localStorage.getItem(CACHE_KEY))
      if (!cached) return null

      let entry: unknown
      try {
        entry = JSON.parse(cached)
      } catch {
        debug.warn(CACHE, 'Failed to parse cache entry')
        return null
      }

      // Validate cache entry structure
      if (!isValidCacheEntry(entry)) {
        debug.warn(CACHE, 'Invalid cache entry structure')
        return null
      }

      // Check version
      if (entry.version !== CACHE_VERSION) {
        debug.log(CACHE, 'Cache version mismatch')
        return null
      }

      // Check TTL
      if (Date.now() - entry.timestamp > CACHE_TTL) {
        debug.log(CACHE, 'Cache expired')
        return null
      }

      // Check size
      if (entry.size > MAX_CACHE_SIZE) {
        debug.warn(CACHE, 'Cache size exceeds limit')
        return null
      }

      debug.log(CACHE, 'Loaded from cache', {
        count: entry.data.length,
        age: Date.now() - entry.timestamp
      })

      return entry.data
    } catch (err) {
      debug.warn(CACHE, 'Failed to load from cache:', err)
      return null
    }
  },

  /**
   * Save parameters to cache
   */
  async saveToCache(params: RawParameter[]): Promise<void> {
    try {
      // Calculate entry size
      const entrySize = new Blob([JSON.stringify(params)]).size

      // Skip caching if too large
      if (entrySize > MAX_CACHE_SIZE) {
        debug.warn(CACHE, 'Parameters too large to cache', {
          size: entrySize,
          limit: MAX_CACHE_SIZE
        })
        return
      }

      const entry: CacheEntry = {
        data: params,
        timestamp: Date.now(),
        version: CACHE_VERSION,
        size: entrySize
      }

      await Promise.resolve(localStorage.setItem(CACHE_KEY, JSON.stringify(entry)))

      debug.log(CACHE, 'Saved to cache', {
        count: params.length
      })
    } catch (err) {
      debug.warn(CACHE, 'Failed to save to cache:', err)
    }
  },

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    try {
      await Promise.resolve(localStorage.removeItem(CACHE_KEY))
      debug.log(CACHE, 'Cache cleared')
    } catch (err) {
      debug.warn(CACHE, 'Failed to clear cache:', err)
    }
  }
}
