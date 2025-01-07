import type { DebugCategories } from '~/composables/core/utils/debug'
import { debug } from '~/composables/core/utils/debug'
import type { RawParameter, ParameterRecovery } from './types'
import { parameterCache } from './cache'

// Extend debug categories
const RECOVERY = 'recovery' as DebugCategories

/**
 * Parameter recovery implementation
 */
export const parameterRecovery: ParameterRecovery = {
  /**
   * Try to recover raw parameters
   */
  async recoverRawParameters(): Promise<RawParameter[]> {
    debug.log(RECOVERY, 'Attempting parameter recovery')

    // 1. Try cache first
    const cached = await parameterCache.loadFromCache()
    if (cached?.length) {
      debug.log(RECOVERY, 'Using cached parameters', {
        count: cached.length
      })
      return cached
    }

    // 2. Create minimal valid state
    const minimal = [this.createMinimalParameter('default')]
    debug.log(RECOVERY, 'Using minimal parameters', {
      count: minimal.length
    })
    return minimal
  },

  /**
   * Create minimal valid parameter
   */
  createMinimalParameter(id: string): RawParameter {
    return {
      id,
      name: 'Unknown',
      value: null,
      fetchedGroup: 'Parameters',
      metadata: {
        category: 'Unknown',
        isSystem: false
      }
    }
  }
}
