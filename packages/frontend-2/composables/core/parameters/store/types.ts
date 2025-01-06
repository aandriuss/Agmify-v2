import type {
  ElementData,
  RawParameter,
  AvailableBimParameter,
  AvailableUserParameter,
  SelectedParameter,
  BaseParameterCollections
} from '~/composables/core/types'

// Re-export types from centralized location
export type {
  RawParameter,
  AvailableBimParameter,
  AvailableUserParameter,
  SelectedParameter
}

// Export creation utilities
export {
  createAvailableBimParameter,
  createAvailableUserParameter,
  createSelectedParameter
} from '~/composables/core/types/parameters'

/**
 * Available parameter union type
 */
export type AvailableParameter = AvailableBimParameter | AvailableUserParameter

/**
 * Parameter recovery utilities
 */
export interface ParameterRecovery {
  recoverRawParameters(): Promise<RawParameter[]>
  createMinimalParameter(id: string): RawParameter
}

/**
 * Parameter cache utilities
 */
export interface ParameterCache {
  loadFromCache(): Promise<RawParameter[] | null>
  saveToCache(params: RawParameter[]): Promise<void>
  clearCache(): Promise<void>
}

/**
 * Debug categories for parameter operations
 */
export const ParameterDebugCategories = {
  RECOVERY: 'recovery',
  CACHE: 'cache',
  PROCESSING: 'processing',
  STATE: 'state'
} as const

export type ParameterDebugCategory =
  (typeof ParameterDebugCategories)[keyof typeof ParameterDebugCategories]

/**
 * Parameter store state
 */
export interface ParameterStoreState extends BaseParameterCollections {
  // Processing state
  processing: {
    status: 'idle' | 'processing' | 'complete' | 'error'
    error: Error | null
    lastAttempt: number | null
  }

  // Selected parameters
  selectedParameters: {
    parent: SelectedParameter[]
    child: SelectedParameter[]
  }

  // Store state
  lastUpdated: number
  initialized: boolean
}

/**
 * Parameter store interface
 */
export interface ParameterStore {
  // State
  state: ComputedRef<ParameterStoreState>

  // Raw parameters
  parentRawParameters: ComputedRef<RawParameter[]>
  childRawParameters: ComputedRef<RawParameter[]>

  // Available parameters
  parentAvailableBimParameters: ComputedRef<AvailableBimParameter[]>
  parentAvailableUserParameters: ComputedRef<AvailableUserParameter[]>
  childAvailableBimParameters: ComputedRef<AvailableBimParameter[]>
  childAvailableUserParameters: ComputedRef<AvailableUserParameter[]>

  // Selected parameters
  selectedParentParameters: ComputedRef<SelectedParameter[]>
  selectedChildParameters: ComputedRef<SelectedParameter[]>

  // Status
  isProcessing: ComputedRef<boolean>
  hasError: ComputedRef<boolean>
  lastUpdated: ComputedRef<number>

  // Core operations
  init(): Promise<void>
  processParameters(elements: ElementData[]): Promise<void>

  // Parameter operations
  updateSelectedParameters(params: {
    parent?: SelectedParameter[]
    child?: SelectedParameter[]
  }): void
  updateParameterVisibility(parameterId: string, visible: boolean): void

  // Cache operations
  loadFromCache(): Promise<void>
  saveToCache(): Promise<void>
  clearCache(): Promise<void>

  // Reset
  reset(): void
}
