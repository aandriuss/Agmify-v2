import type { ElementData } from '~/composables/core/types'
import type { ComputedRef } from 'vue'
import type {
  RawParameter,
  AvailableBimParameter,
  AvailableUserParameter,
  SelectedParameter
} from '~/composables/core/types/parameters/parameter-states'

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
} from '~/composables/core/types/parameters/parameter-states'

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
 * Parameter collections interface
 */
export interface ParameterCollections {
  // Available parameters after processing and parent/child categorization
  available: {
    parent: {
      bim: AvailableBimParameter[]
      user: AvailableUserParameter[]
    }
    child: {
      bim: AvailableBimParameter[]
      user: AvailableUserParameter[]
    }
  }

  // Selected parameters for tables
  selected: {
    parent: SelectedParameter[]
    child: SelectedParameter[]
  }
}

/**
 * Parameter store state
 */
export interface ParameterStoreState {
  // Raw parameters from BIM data (before parent/child categorization)
  raw: RawParameter[]

  // Processed parameters
  collections: ParameterCollections

  // Processing state
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
  rawParameters: ComputedRef<RawParameter[]>

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

  // Cache operations
  loadFromCache(): Promise<void>
  saveToCache(): Promise<void>
  clearCache(): Promise<void>

  // Reset
  reset(): void
}
