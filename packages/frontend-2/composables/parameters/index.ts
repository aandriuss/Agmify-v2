/**
 * @deprecated Import from '~/composables/core/parameters' instead.
 * This file is maintained for backwards compatibility and will be removed in a future version.
 */

import { debug, DebugCategories } from '~/composables/core/utils/debug'

// Re-export everything from core parameters
export * from '~/composables/core/parameters'

// Log deprecation warning
debug.warn(
  DebugCategories.PARAMETERS,
  'Importing from ~/composables/parameters is deprecated. Import from ~/composables/core/parameters instead.'
)
