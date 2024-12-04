import type { ColumnDef, TableRow, ParameterValue } from '~/composables/core/types'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'

export function safeJSONClone<T>(obj: T): T {
  const jsonString = JSON.stringify(obj)
  const parsed = JSON.parse(jsonString) as T
  return parsed
}

export function validateData(
  data: unknown[],
  handleError: (error: Error) => void
): boolean {
  debug.startState(DebugCategories.VALIDATION, 'Starting data validation', {
    count: data?.length
  })

  try {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array')
    }

    const invalidItems = data.filter((item) => !isValidParameters(item))
    if (invalidItems.length > 0) {
      debug.warn(DebugCategories.VALIDATION, 'Invalid data items found', {
        invalidCount: invalidItems.length,
        sampleInvalid: invalidItems[0]
      })
      throw new Error(`Invalid data items found: ${invalidItems.length} items`)
    }

    debug.completeState(DebugCategories.VALIDATION, 'Data validation passed', {
      count: data.length,
      sampleValid: data[0]
    })
    return true
  } catch (error) {
    debug.error(DebugCategories.ERROR, 'Data validation failed', error)
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

function isValidParameterValue(value: unknown): value is ParameterValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
}

function isValidParameters(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false

  const record = item as Record<string, unknown>
  if (!record.parameters || typeof record.parameters !== 'object') return false

  const parameters = record.parameters as Record<string, unknown>
  return Object.values(parameters).every(
    (value) =>
      isValidParameterValue(value) ||
      (typeof value === 'object' && value !== null && 'currentValue' in value)
  )
}

export function updateLocalColumns(
  sourceColumns: ColumnDef[],
  updateFn: (columns: ColumnDef[]) => void
): void {
  debug.startState(DebugCategories.COLUMNS, 'Updating local columns', {
    count: sourceColumns.length,
    fields: sourceColumns.map((c) => c.field)
  })

  try {
    const columns = sourceColumns.map((col) => ({
      ...col,
      visible: col.visible !== false, // Show column unless explicitly hidden
      type: col.type || 'string', // Ensure type is always set
      order: typeof col.order === 'number' ? col.order : 0 // Ensure order is always set
    }))

    const sortedColumns = sortColumnsByOrder(columns)
    updateFn(sortedColumns)

    debug.completeState(DebugCategories.COLUMNS, 'Local columns updated', {
      count: sortedColumns.length,
      visibleCount: sortedColumns.filter((c) => c.visible).length,
      orderedFields: sortedColumns.map((c) => c.field)
    })
  } catch (error) {
    debug.error(DebugCategories.ERROR, 'Error updating local columns', error)
    throw error
  }
}

/**
 * Validate array of TableRow objects
 */
export function validateTableRows(data: unknown[]): TableRow[] {
  debug.startState(DebugCategories.DATA_VALIDATION, 'Validating table rows', {
    inputCount: data?.length,
    sampleInput: data?.[0]
  })

  if (!Array.isArray(data)) {
    debug.warn(DebugCategories.VALIDATION, 'Invalid data format', {
      received: typeof data,
      value: data
    })
    return []
  }

  // Only validate parameters exist and are valid
  const validItems = data.filter((item): item is TableRow => {
    const isValid = isValidParameters(item)
    if (!isValid) {
      debug.warn(DebugCategories.VALIDATION, 'Invalid parameters in row', {
        item,
        reason: 'Parameters missing or invalid'
      })
    }
    return isValid
  })

  debug.completeState(
    DebugCategories.DATA_VALIDATION,
    'Table row validation complete',
    {
      inputCount: data.length,
      validCount: validItems.length,
      invalidCount: data.length - validItems.length,
      sampleValidRow: validItems[0]
    }
  )

  return validItems
}
