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
 * Extract group and name from parameter field
 */
function extractGroupAndName(field: string): { group: string; name: string } {
  const parts = field.split('.')
  if (parts.length > 1) {
    return {
      group: parts[0],
      name: parts[parts.length - 1]
    }
  }
  return {
    group: 'Parameters',
    name: field
  }
}

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
        const field = String(param.field)
        const { group, name } = extractGroupAndName(field)

        return createUserParameterWithDefaults({
          field,
          name: String((param as { name?: unknown }).name || name),
          type: 'fixed',
          group: (param as { group?: unknown }).group
            ? String((param as { group?: unknown }).group)
            : group
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
  const { group, name } = extractGroupAndName(row.field)

  const metadata: Record<string, unknown> = {
    ...(row.metadata || {}),
    kind: row.metadata?.kind || 'bim',
    group: row.metadata?.group || group
  }

  const param = createUserParameterWithDefaults({
    id: row.id,
    name: row.name || name,
    field: row.field,
    header: row.header,
    visible: row.visible,
    removable: row.removable,
    order: row.order,
    type: 'fixed',
    category: row.category || '',
    value: null,
    group: String(metadata.group),
    metadata
  })

  return param as TableParameter
}

/**
 * Convert value to ParameterValue type with type safety
 */
export function convertToParameterValue(value: unknown): ParameterValue {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value
  if (Array.isArray(value)) return JSON.stringify(value)
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
