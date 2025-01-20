import type {
  TableColumn,
  TableColumnType,
  ParameterValue,
  TableRow,
  ElementData
} from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

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

export function sortColumnsByOrder(columns: TableColumn[]): TableColumn[] {
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

function isValidColumnType(type: unknown): type is TableColumnType {
  return type === 'string' || type === 'number' || type === 'boolean' || type === 'date'
}

export function updateLocalColumns(
  sourceColumns: TableColumn[],
  updateFn: (columns: TableColumn[]) => void
): void {
  debug.startState(DebugCategories.COLUMNS, 'Updating local columns', {
    count: sourceColumns.length,
    fields: sourceColumns.map((c) => c.field)
  })

  try {
    const columns = sourceColumns.map((col) => ({
      ...col,
      visible: col.visible !== false,
      // Access type through parameter if it exists, otherwise default to 'string'
      type: isValidColumnType(col.parameter?.type) ? col.parameter.type : 'string',
      order: typeof col.order === 'number' ? col.order : 0
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

// Type guard for ElementData
function isElementData(value: unknown): value is ElementData {
  if (!isValidParameters(value)) return false

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.mark === 'string' &&
    typeof candidate.category === 'string' &&
    Array.isArray(candidate.details)
  )
}

// Type guard for TableRow
function isTableRow(value: unknown): value is TableRow {
  if (!isValidParameters(value)) return false

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.mark === 'string' &&
    typeof candidate.category === 'string' &&
    (!('details' in candidate) || Array.isArray(candidate.details))
  )
}

/**
 * Validate array of TableRow or ElementData objects
 */
export function validateTableRows(data: unknown[]): (TableRow | ElementData)[] {
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

  // Validate each item is either a TableRow or ElementData
  const validItems = data.filter((item): item is TableRow | ElementData => {
    const isValid = isTableRow(item) || isElementData(item)
    if (!isValid) {
      debug.warn(DebugCategories.VALIDATION, 'Invalid row', {
        item,
        reason: 'Item is neither TableRow nor ElementData'
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
      sampleValidRow: validItems[0],
      types: {
        tableRows: validItems.filter(isTableRow).length,
        elementData: validItems.filter(isElementData).length
      }
    }
  )

  return validItems
}
