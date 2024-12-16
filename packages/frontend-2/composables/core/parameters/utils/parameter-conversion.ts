import type {
  TableParameter,
  ViewerTableRow,
  ParameterValue,
  Parameter
} from '~/composables/core/types'
import {
  createUserParameterWithDefaults,
  toTableParameters
} from '~/composables/core/types'
import { stringToParameterValue } from '~/composables/core/utils/parameters'
import type { CategoryTableRow } from '../../tables/state/useCategoryTableState'

/**
 * Convert parameter value based on parameter type
 */
export function convertParameterValue(
  value: unknown,
  parameter: Parameter
): ParameterValue {
  // Handle null/undefined
  if (value === null || value === undefined) return null

  // Convert to string first for consistent handling
  const stringValue = String(value)
  if (!stringValue) return null

  // Convert based on parameter type
  return stringToParameterValue(stringValue, parameter.type)
}

/**
 * Convert custom parameters to table parameters
 */
export function convertUserParameters(parameters: unknown[]): TableParameter[] {
  return toTableParameters(
    parameters.map((param) => {
      if (typeof param === 'object' && param !== null && 'field' in param) {
        return createUserParameterWithDefaults({
          field: String(param.field),
          name: String((param as { name?: unknown }).name || param.field),
          type: 'fixed',
          group: 'Custom'
        })
      }
      throw new Error('Invalid custom parameter format')
    })
  )
}

/**
 * Convert row to category table format
 */
export function toCategoryRow(row: TableParameter): CategoryTableRow {
  return {
    id: row.id,
    name: row.name,
    field: row.field,
    header: row.header,
    visible: row.visible,
    removable: row.removable,
    order: row.order,
    type: row.type,
    category: row.category,
    parameters: {} as Record<string, ParameterValue>,
    metadata: row.metadata,
    _visible: true,
    isChild: false,
    *[Symbol.iterator]() {
      yield* Object.entries(this)
    }
  }
}

/**
 * Convert viewer row to table parameter
 */
export function viewerRowToTableParameter(row: ViewerTableRow): TableParameter {
  const param = createUserParameterWithDefaults({
    id: row.id,
    name: row.name,
    field: row.field,
    header: row.header,
    visible: row.visible,
    removable: row.removable,
    order: row.order,
    type: 'fixed',
    category: row.category || '',
    value: null,
    group: String(row.metadata?.kind || 'Custom'),
    metadata: row.metadata
  })

  return param as TableParameter
}
