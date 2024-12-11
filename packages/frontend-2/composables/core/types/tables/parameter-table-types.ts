import type { Parameter, BimParameter, UserParameter } from '../parameters'
import type { TableConfig, TableState } from './index'

/**
 * Table-specific parameter interfaces that adapt parameters for table use
 */

/**
 * Base table parameter interface
 * Combines Parameter with table requirements
 */
export type TableParameter = (BimParameter | UserParameter) & {
  [key: string]: unknown
  get(key: string): unknown
  toString(): string
}

/**
 * Table-specific BIM parameter interface
 * Adds table functionality to BIM parameters
 */
export type TableBimParameter = BimParameter & {
  [key: string]: unknown
  get(key: string): unknown
  toString(): string
}

/**
 * Table-specific user parameter interface
 * Adds table functionality to user parameters
 */
export type TableUserParameter = UserParameter & {
  [key: string]: unknown
  get(key: string): unknown
  toString(): string
}

/**
 * Parameter table configuration
 * Extends base table config with parameter-specific settings
 */
export interface ParameterTableConfig extends TableConfig {
  parameterGroups?: Map<string, Parameter[]>
  parameterSettings?: Record<string, unknown>
}

/**
 * Parameter table state
 * Extends base table state with parameter-specific state
 */
export interface ParameterTableState extends TableState {
  selectedParameters: Set<string>
  parameterGroups: Map<string, Parameter[]>
}

/**
 * Convert Parameter to TableParameter
 * Adds required table functionality while preserving parameter behavior
 */
export function toTableParameter(param: Parameter): TableParameter {
  const tableParam = {
    ...param,
    // Add dynamic property access for table functionality
    get(key: string): unknown {
      if (key in this) {
        return (this as Record<string, unknown>)[key]
      }
      return undefined
    },
    // Add string representation for table display
    toString(): string {
      return this.name || this.id
    }
  }

  // Add index signature support
  return new Proxy(tableParam, {
    get(target: Record<string, unknown>, prop: string | symbol): unknown {
      if (typeof prop === 'string') {
        if (prop in target) {
          return target[prop]
        }
        return (target as TableParameter).get(prop)
      }
      return undefined
    }
  }) as TableParameter
}

/**
 * Convert array of Parameters to TableParameters
 */
export function toTableParameters(params: Parameter[]): TableParameter[] {
  return params.map(toTableParameter)
}

/**
 * Type guards
 */
export function isTableBimParameter(value: unknown): value is TableBimParameter {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    value.kind === 'bim' &&
    'sourceValue' in value &&
    'fetchedGroup' in value &&
    'currentGroup' in value &&
    'get' in value &&
    typeof (value as TableBimParameter).get === 'function'
  )
}

export function isTableUserParameter(value: unknown): value is TableUserParameter {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    value.kind === 'user' &&
    'group' in value &&
    'get' in value &&
    typeof (value as TableUserParameter).get === 'function'
  )
}

export function isTableParameter(value: unknown): value is TableParameter {
  return isTableBimParameter(value) || isTableUserParameter(value)
}
