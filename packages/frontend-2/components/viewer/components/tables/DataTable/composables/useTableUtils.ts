import type { ColumnDef } from './columns/types'
import type { TableRow } from '~/components/viewer/schedules/types'
import { debug, DebugCategories } from '~/components/viewer/schedules/utils/debug'

export function safeJSONClone<T>(obj: T): T {
  const jsonString = JSON.stringify(obj)
  const parsed = JSON.parse(jsonString) as T
  return parsed
}

export function validateData(
  data: unknown[],
  handleError: (error: Error) => void
): boolean {
  try {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array')
    }

    const invalidItems = data.filter((item) => !isTableRow(item))
    if (invalidItems.length > 0) {
      debug.warn(DebugCategories.VALIDATION, 'Invalid data items found', invalidItems)
      throw new Error(`Invalid data items found: ${invalidItems.length} items`)
    }

    debug.log(DebugCategories.VALIDATION, 'Data validation passed', {
      count: data.length
    })
    return true
  } catch (error) {
    handleError(error as Error)
    return false
  }
}

export function sortColumnsByOrder(columns: ColumnDef[]): ColumnDef[] {
  return [...columns].sort((a, b) => {
    const orderA = typeof a.order === 'number' ? a.order : 0
    const orderB = typeof b.order === 'number' ? b.order : 0
    return orderA - orderB
  })
}

/**
 * Type guard for TableRow
 */
export function isTableRow(item: unknown): item is TableRow {
  if (!item || typeof item !== 'object') return false

  const record = item as Record<string, unknown>
  const requiredFields = ['id', 'mark', 'category', 'parameters']

  const hasRequiredFields = requiredFields.every((field) => {
    const value = record[field]
    return value !== undefined && value !== null
  })

  if (!hasRequiredFields) {
    debug.warn(DebugCategories.VALIDATION, 'Missing required fields', {
      item,
      missingFields: requiredFields.filter((field) => {
        const value = record[field]
        return value === undefined || value === null
      })
    })
    return false
  }

  // Check parameters is an object with ParameterValueState values
  const parameters = record.parameters as Record<string, unknown>
  if (typeof parameters !== 'object' || parameters === null) {
    return false
  }

  return true
}

export function updateLocalColumns(
  sourceColumns: ColumnDef[],
  updateFn: (columns: ColumnDef[]) => void
): void {
  try {
    const columns = sourceColumns.map((col) => ({
      ...col,
      visible: col.visible !== false, // Show column unless explicitly hidden
      type: col.type || 'string', // Ensure type is always set
      order: typeof col.order === 'number' ? col.order : 0 // Ensure order is always set
    }))

    debug.log(DebugCategories.COLUMNS, 'Updating local columns', columns)

    updateFn(sortColumnsByOrder(columns))
  } catch (error) {
    debug.error(DebugCategories.ERROR, 'Error updating local columns', error)
    throw error
  }
}

/**
 * Validate array of TableRow objects
 */
export function validateTableRows(data: unknown[]): TableRow[] {
  debug.log(DebugCategories.DATA_TRANSFORM, 'Validating table rows', {
    timestamp: new Date().toISOString(),
    inputCount: data?.length
  })

  if (!Array.isArray(data)) {
    debug.warn(DebugCategories.VALIDATION, 'Invalid data format', data)
    return []
  }

  // Validate each item is a TableRow
  const validItems = data.filter((item): item is TableRow => {
    const isValid = isTableRow(item)
    if (!isValid) {
      debug.warn(DebugCategories.VALIDATION, 'Invalid table row', item)
    }
    return isValid
  })

  debug.log(DebugCategories.DATA_TRANSFORM, 'Validation complete', {
    timestamp: new Date().toISOString(),
    validCount: validItems.length
  })

  return validItems
}
