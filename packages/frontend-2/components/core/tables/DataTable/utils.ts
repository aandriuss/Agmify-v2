import type { TableColumnDef, BaseTableRow } from './types'

/**
 * Custom error class for table operations
 */
export class TableError extends Error {
  constructor(message: string, public context?: unknown) {
    super(message)
    this.name = 'TableError'
  }
}

/**
 * Type guard to check if a value matches the original type
 */
function isType<T>(value: unknown, original: T): value is T {
  if (value === null || value === undefined) {
    return original === null || original === undefined
  }

  if (typeof original !== typeof value) {
    return false
  }

  if (Array.isArray(original)) {
    return (
      Array.isArray(value) &&
      value.every((item, index) => isType(item, original[index]))
    )
  }

  if (original instanceof Date) {
    return value instanceof Date
  }

  if (typeof original === 'object' && original !== null) {
    if (typeof value !== 'object' || value === null) return false
    return Object.keys(original as object).every((key) =>
      isType(
        (value as Record<string, unknown>)[key],
        (original as Record<string, unknown>)[key]
      )
    )
  }

  return true
}

/**
 * Safely clone an object using JSON parse/stringify with type checking
 */
export function safeJSONClone<T>(obj: T): T {
  try {
    const jsonString = JSON.stringify(obj)
    if (typeof jsonString !== 'string') {
      throw new TableError('Failed to stringify object')
    }
    const parsed = JSON.parse(jsonString)
    if (!isType(parsed, obj)) {
      throw new TableError('Parsed value does not match original type')
    }
    return parsed
  } catch (error) {
    throw new TableError(
      'Failed to clone object',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

/**
 * Sort columns by their order property
 */
export function sortColumnsByOrder(columns: TableColumnDef[]): TableColumnDef[] {
  return [...columns].sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER
    return orderA - orderB
  })
}

/**
 * Ensure all required column properties are present
 */
export function ensureColumnProperties(
  column: Partial<TableColumnDef>
): TableColumnDef {
  const defaultGroup = 'Default'
  return {
    id: column.id || crypto.randomUUID(),
    name: column.name || column.header || column.field || 'Unnamed Column',
    field: column.field || '',
    header: column.header || column.name || column.field || 'Unnamed Column',
    type: column.type || 'string',
    visible: column.visible ?? true,
    currentGroup: column.currentGroup || column.category || defaultGroup,
    removable: column.removable ?? true,
    category: column.category || defaultGroup,
    description:
      column.description || `${column.category || defaultGroup} > ${column.field || ''}`
  }
}

/**
 * Update local columns with proper validation
 */
export function updateLocalColumns(
  newColumns: Partial<TableColumnDef>[],
  setter: (columns: TableColumnDef[]) => void
): void {
  const validColumns = newColumns
    .filter((col): col is Partial<TableColumnDef> => {
      const hasRequiredBase = col && typeof col === 'object'
      if (!hasRequiredBase) {
        throw new TableError('Invalid column definition', col)
      }
      return true
    })
    .map(ensureColumnProperties)

  setter(sortColumnsByOrder(validColumns))
}

/**
 * Validate table rows
 */
export function validateTableRows<T extends BaseTableRow>(rows: unknown[]): T[] {
  return rows.filter((row): row is T => {
    if (!row || typeof row !== 'object') return false
    return 'id' in row && typeof (row as T).id === 'string'
  })
}

/**
 * Get field value from row using dot notation
 */
export function getFieldValue(row: BaseTableRow, field: string): unknown {
  return field.split('.').reduce((obj, key) => {
    if (obj && typeof obj === 'object') {
      return (obj as Record<string, unknown>)[key]
    }
    return undefined
  }, row as unknown)
}

/**
 * Format cell value based on column type
 */
export function formatCellValue(value: unknown, type: string): string {
  if (value === null || value === undefined) return ''

  switch (type) {
    case 'number':
      return typeof value === 'number' ? value.toString() : ''
    case 'boolean':
      return value === true ? 'Yes' : 'No'
    case 'date':
      return value instanceof Date ? value.toLocaleDateString() : ''
    case 'string':
      return String(value)
    default:
      return typeof value === 'object' ? JSON.stringify(value) : String(value)
  }
}

/**
 * Compare values for sorting
 */
export function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0
  if (a === null || a === undefined) return 1
  if (b === null || b === undefined) return -1

  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b)
  }

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime()
  }

  return String(a).localeCompare(String(b))
}

/**
 * Filter row based on filter criteria
 */
export function filterRow(
  row: BaseTableRow,
  filters: Record<string, { value: unknown; matchMode: string }>
): boolean {
  return Object.entries(filters).every(([field, filter]) => {
    const value = getFieldValue(row, field)
    if (!filter.value) return true

    switch (filter.matchMode) {
      case 'equals':
        return value === filter.value
      case 'contains':
        return String(value).toLowerCase().includes(String(filter.value).toLowerCase())
      case 'startsWith':
        return String(value)
          .toLowerCase()
          .startsWith(String(filter.value).toLowerCase())
      case 'endsWith':
        return String(value).toLowerCase().endsWith(String(filter.value).toLowerCase())
      default:
        return true
    }
  })
}

/**
 * Update column order after reordering
 */
export function updateColumnOrder(columns: TableColumnDef[]): TableColumnDef[] {
  return columns.map((col, index) => ({
    ...col,
    order: index
  }))
}

/**
 * Group columns by category
 */
export function groupColumnsByCategory(
  columns: TableColumnDef[]
): Record<string, TableColumnDef[]> {
  return columns.reduce((groups, column) => {
    const category = column.category || 'Default'
    groups[category] = groups[category] || []
    groups[category].push(column)
    return groups
  }, {} as Record<string, TableColumnDef[]>)
}

/**
 * Get visible columns
 */
export function getVisibleColumns(columns: TableColumnDef[]): TableColumnDef[] {
  return columns.filter((col) => col.visible)
}
