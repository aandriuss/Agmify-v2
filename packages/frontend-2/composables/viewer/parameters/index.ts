/**
 * Viewer-specific parameter functionality
 * Handles BIM parameter discovery and integration with core parameter system
 *
 * Flow:
 * 1. Raw BIM parameters (from viewer)
 * 2. Available BIM parameters (processed)
 * 3. Selected parameters (user choice)
 * 4. Table columns (for display)
 */

// BIM parameter handling
export { useBIMParameters } from './useBIMParameters'

// Re-export core parameter types
export type { ParameterValue } from '~/composables/core/types'

export type {
  AvailableBimParameter,
  AvailableUserParameter,
  SelectedParameter
} from '~/composables/core/types/parameters/parameter-states'

// Re-export viewer types
export type { BIMNodeRaw, BIMNode } from '~/composables/core/types/viewer/viewer-base'
