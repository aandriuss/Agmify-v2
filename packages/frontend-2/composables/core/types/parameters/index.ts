/**
 * Re-export all types
 */
export * from './constants'
export * from './discovery-types'
export * from './header-types'
export * from './parameter-states'
export * from './parameter-types'
export * from './value-types'

// Export BimValueType as ParameterValueType for backward compatibility
export type { BimValueType as ParameterValueType } from './value-types'

// Export Parameter as ParameterDefinition for backward compatibility
export type { Parameter as ParameterDefinition } from './parameter-types'

// Export RawParameter as RawBimParameter for backward compatibility
export type { RawParameter as RawBimParameter } from './parameter-states'
