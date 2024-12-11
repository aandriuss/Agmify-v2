import type { ElementData, TableRow } from '../../types'
import type { ParameterValue } from '../../types/parameters'
import type { TableRowData } from '../../types/tables/initialization-types'

/**
 * Type guard for Record<string, unknown>
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Convert unknown value to number or undefined
 */
function toNumberOrUndefined(value: unknown): number | undefined {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const num = Number(value)
    return isNaN(num) ? undefined : num
  }
  return undefined
}

/**
 * Convert TableRow to ElementData
 */
export function toElementData(row: TableRow): ElementData {
  return {
    // Required BaseItem fields
    id: String(row.id),
    name: String(row.name || row.id),
    field: String(row.field || row.id),
    header: String(row.header || row.name || row.id),
    visible: Boolean(row.visible ?? true),
    removable: Boolean(row.removable ?? true),
    order: toNumberOrUndefined(row.order),

    // Required ElementData fields
    type: String(row.type),
    parameters: (isRecord(row.parameters) ? row.parameters : {}) as Record<
      string,
      ParameterValue
    >,

    // Optional fields
    mark: row.mark ? String(row.mark) : undefined,
    category: row.category ? String(row.category) : undefined,
    metadata: isRecord(row.metadata) ? row.metadata : undefined,
    details: Array.isArray(row.details) ? row.details : undefined,
    _visible: typeof row._visible === 'boolean' ? row._visible : undefined,
    host: row.host ? String(row.host) : undefined,
    _raw: row._raw,
    isChild: Boolean(row.isChild)
  }
}

/**
 * Convert array of TableRow to ElementData
 */
export function toElementDataArray(rows: TableRow[]): ElementData[] {
  return rows.map(toElementData)
}

/**
 * Convert ElementData or TableRow to TableRowData
 */
export function toTableRowData(row: ElementData | TableRow): TableRowData {
  const metadata =
    'metadata' in row && row.metadata && isRecord(row.metadata)
      ? row.metadata
      : undefined

  return {
    id: String(row.id),
    type: String(row.type),
    isChild: Boolean('isChild' in row ? row.isChild : false),
    details: Array.isArray(row.details) ? row.details : undefined,
    parameters: isElementData(row) ? row.parameters : undefined,
    metadata,
    name: 'name' in row ? String(row.name) : undefined,
    field: 'field' in row ? String(row.field) : undefined,
    header: 'header' in row ? String(row.header) : undefined,
    visible: 'visible' in row ? Boolean(row.visible) : undefined,
    removable: 'removable' in row ? Boolean(row.removable) : undefined
  }
}

/**
 * Type guard for TableRow
 */
export function isTableRow(value: unknown): value is TableRow {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'type' in value &&
    typeof value.type === 'string' &&
    'isChild' in value &&
    typeof value.isChild === 'boolean'
  )
}

/**
 * Type guard for ElementData
 */
export function isElementData(value: unknown): value is ElementData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'field' in value &&
    typeof value.field === 'string' &&
    'header' in value &&
    typeof value.header === 'string' &&
    'visible' in value &&
    typeof value.visible === 'boolean' &&
    'removable' in value &&
    typeof value.removable === 'boolean' &&
    'type' in value &&
    typeof value.type === 'string' &&
    'parameters' in value &&
    typeof value.parameters === 'object'
  )
}
