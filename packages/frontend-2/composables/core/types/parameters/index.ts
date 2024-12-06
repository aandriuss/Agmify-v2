import type { Ref } from 'vue'

/**
 * Parameter Type System
 *
 * This module follows a specific naming convention:
 *
 * 1. Singular (Parameter) is used for:
 *    - Base interfaces (Parameter, CustomParameter)
 *    - Single parameter operations (ParameterDefinition)
 *    - Value types (ParameterValue, ParameterType)
 *
 * 2. Plural (Parameters) is used for:
 *    - Collections/Records of parameters
 *    - State management (ParameterState)
 */

/**
 * Basic parameter value types
 */
export type ParameterValueType = 'string' | 'number' | 'boolean'

/**
 * Parameter value type
 */
export type ParameterValue = string | number | boolean | null

/**
 * Base parameter value interface
 */
interface BaseParameterValue {
  value: unknown
  isValid: boolean
  error?: string
}

/**
 * Parameter value record entry - base interface for parameter values
 */
export interface ParameterValueEntry extends BaseParameterValue {
  fetchedValue: ParameterValue
  currentValue: unknown
  previousValue: ParameterValue
  userValue: ParameterValue | null
}

/**
 * Parameter value state tracking
 * @deprecated Use ParameterValueEntry instead
 */
export interface ParameterValueState extends BaseParameterValue {
  fetchedValue: ParameterValue
  currentValue: unknown
  previousValue: ParameterValue
  userValue: ParameterValue | null
}

/**
 * Parameters collection type - maps parameter keys to their value entries
 */
export type Parameters = Record<string, ParameterValueEntry>

/**
 * Parameter values record type
 * @deprecated Use Parameters type instead
 */
export type ParameterValuesRecord = Parameters

/**
 * Parameter type
 */
export type ParameterType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'object'
  | 'array'
  | 'equation'
  | 'fixed'

/**
 * Parameter validation function type
 */
export type ParameterValidationFn = (value: unknown) => boolean

/**
 * Parameter validation rules
 */
export interface ParameterValidationRules {
  required?: boolean
  min?: number
  max?: number
  pattern?: string
}

/**
 * Parameter definition interface for defining parameter structure
 */
export interface ParameterDefinition {
  id: string
  name: string
  field: string
  type: ParameterType
  description?: string
  metadata?: Record<string, unknown>
  value?: unknown
  visible?: boolean
  order?: number
  header?: string
  source?: string
  category?: string
  isFetched?: boolean
  fetchedGroup?: string
  currentGroup?: string
  isCustom?: boolean
  isFixed?: boolean
  removable?: boolean
  validation?: ParameterValidationFn
  validationRules?: ParameterValidationRules
}

/**
 * Base parameter interface defining common parameter properties
 */
export interface Parameter {
  id: string
  name: string
  value: unknown
  type: ParameterType
  visible: boolean
  order?: number
  field: string
  header?: string
  category?: string
  description?: string
  source?: string
  isFetched?: boolean
  fetchedGroup?: string
  currentGroup?: string
}

/**
 * Extended parameter interface with additional properties for custom parameters
 */
export interface CustomParameter extends Parameter {
  description?: string
  metadata?: Record<string, unknown>
  isCustom?: boolean
  isFetched?: boolean
  source?: string
  equation?: string
  group?: string
  removable?: boolean
}

/**
 * Parameter group for organizing related parameters
 */
export interface ParameterGroup {
  id: string
  name: string
  parameters: Parameter[]
  metadata?: Record<string, unknown>
}

/**
 * Fixed parameter group interface
 */
export interface FixedParameterGroup {
  category: string
  parameters: ParameterDefinition[]
}

/**
 * Form data structure for parameter creation/editing
 */
export interface ParameterFormData {
  name: string
  type: ParameterType
  value?: unknown
  equation?: unknown
  group?: string
  description?: string
  metadata?: Record<string, unknown>
  field?: string
  errors?: {
    name?: unknown
    value?: unknown
    equation?: unknown
  }
}

/**
 * Unified parameter interface combining base and computed properties
 */
export interface UnifiedParameter extends Parameter {
  header?: string
  category?: string
  description?: string
  source?: string
  isFetched?: boolean
  fetchedGroup?: string
  currentGroup?: string
  removable?: boolean
  selectedParameterIds?: string[]
  computed?: {
    value: unknown
    isValid: boolean
    error?: string
  }
}

/**
 * Available headers structure for parameter organization
 */
export interface AvailableHeaders {
  parent: UnifiedParameter[]
  child: UnifiedParameter[]
}

/**
 * Processed parameter interface for storing processed parameter data
 */
export interface ProcessedParameter {
  value: ParameterValue
  metadata?: Record<string, unknown>
  errors?: string[]
  isValid: boolean
}

/**
 * Parameter definitions record type - maps parameter IDs to their definitions
 */
export type ParameterDefinitions = Record<string, ParameterDefinition>

/**
 * Processed parameters record type - maps parameter IDs to their processed values
 */
export type ProcessedParameters = Record<string, ProcessedParameter>

/**
 * Parameter state interface
 */
export interface ParameterState {
  definitions: ParameterDefinitions
  processed: ProcessedParameters
  loading: boolean
  error: Error | null
}

/**
 * Options for useParameters composable
 */
export interface UseParametersOptions {
  initialParameters: ParameterDefinition[]
  searchTerm?: Ref<string>
  isGrouped?: Ref<boolean>
  sortBy?: Ref<'name' | 'category' | 'type' | 'fixed'>
  selectedCategories?: Ref<string[]>
  selectedTypes?: Ref<string[]>
}

/**
 * Parameter statistics interface
 */
export interface ParameterStats {
  total: number
  filtered: number
  fixedCount: number
  categories: string[]
  types: string[]
  groupCount: number
}

/**
 * Helper function to create parameter value state
 */
export function createParameterValueState(value: ParameterValue): ParameterValueEntry {
  return {
    fetchedValue: value,
    currentValue: value,
    previousValue: value,
    userValue: null,
    value,
    isValid: true
  }
}

/**
 * GraphQL response interfaces for user_parameters column
 */
export interface ParametersQueryResponse {
  userParameters: Record<string, Parameter>
}

export interface ParametersMutationResponse {
  userParametersUpdate: boolean
}

export interface ParameterUpdateInput {
  id: string
  name?: string
  value?: unknown
  type?: ParameterType
  description?: string
  metadata?: Record<string, unknown>
  field?: string
  category?: string
}
