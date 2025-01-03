import { debug } from '~/composables/core/utils/debug'
import type { DebugCategories } from '~/composables/core/utils/debug'
import type { RawParameter, ParameterCache } from './types'

// Extend debug categories
const CACHE = 'cache' as DebugCategories

const CACHE_KEY = 'parameter-store-cache'
const CACHE_TTL = 1000 * 60 * 60 // 1 hour

interface CacheEntry {
  data: RawParameter[]
  timestamp: number
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

      const entry = JSON.parse(cached) as CacheEntry

      // Check if cache is still valid
      if (Date.now() - entry.timestamp > CACHE_TTL) {
        debug.log(CACHE, 'Cache expired')
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
      const entry: CacheEntry = {
        data: params,
        timestamp: Date.now()
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
