import type {
  RawParameter,
  AvailableBimParameter,
  AvailableUserParameter,
  SelectedParameter,
  ElementData
} from '~/composables/core/types'
import type { ParameterCollections } from '~/composables/core/types/parameters/parameter-states'

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
export interface ParameterStoreState extends ParameterCollections {
  processing: {
    status: 'idle' | 'processing' | 'complete' | 'error'
    error: Error | null
    lastAttempt: number | null
  }
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
  parentSelectedParameters: ComputedRef<SelectedParameter[]>
  childSelectedParameters: ComputedRef<SelectedParameter[]>

  // Status
  isProcessing: ComputedRef<boolean>
  hasError: ComputedRef<boolean>
  lastUpdated: ComputedRef<number>

  // Core operations
  init(): Promise<void>
  processParameters(elements: ElementData[]): Promise<void>
  updateParameterVisibility(
    parameterId: string,
    visible: boolean,
    isParent: boolean
  ): void

  // Cache operations
  loadFromCache(): Promise<void>
  saveToCache(): Promise<void>
  clearCache(): Promise<void>

  // Reset
  reset(): void
}
