import type { BaseItem } from '../common/base-types'
import type { ParameterValue } from '../parameters'
import type { TableColumn } from '../tables/table-column'

/**
 * Base table row interface
 * Represents a row in any table
 */
export interface BaseTableRow extends BaseItem {
  id: string
  name: string
  field: string
  header: string
  visible: boolean
  order: number
  [key: string]: unknown
}

/**
 * Element data interface that extends BaseTableRow
 */
export interface ElementData extends BaseTableRow {
  // Additional ElementData properties
  type: string
  mark?: string
  category?: string
  parameters?: Record<string, ParameterValue>
  metadata?: Record<string, unknown>
  details?: ElementData[]
  _visible?: boolean
  host?: string
  _raw?: unknown
  isChild?: boolean
  removable: boolean // Required for element operations
}

/**
 * Viewer table row that extends ElementData
 * Used specifically for table display
 */
export interface ViewerTableRow extends ElementData {
  // Ensure all required table properties are present
  parameters: Record<string, ParameterValue> // Make parameters required
  column?: TableColumn // Optional reference to display column
  // Allow dynamic parameter properties
  [key: string]: ParameterValue | unknown
}

/**
 * Element group interface
 */
export interface ElementGroup {
  id: string
  name: string
  elements: ElementData[]
  metadata?: Record<string, unknown>
}

/**
 * Element state interface
 */
export interface ElementState {
  elements: Map<string, ElementData>
  groups: Map<string, ElementGroup>
  loading: boolean
  error: Error | null
}

/**
 * Create a base element with required fields
 */
export function createElementData(
  partial: Partial<ElementData> & { id: string; type: string }
): ElementData {
  const name = partial.name || partial.mark || partial.id
  return {
    // Required BaseTableRow fields
    id: partial.id,
    name,
    field: partial.field || partial.id,
    header: partial.header || name,
    visible: partial.visible ?? true,
    order: partial.order ?? 0,
    removable: partial.removable ?? true,

    // Required ElementData fields
    type: partial.type,
    parameters: partial.parameters || {},

    // Optional fields
    mark: partial.mark,
    category: partial.category,
    metadata: partial.metadata,
    details: partial.details,
    _visible: partial._visible,
    host: partial.host,
    _raw: partial._raw,
    isChild: partial.isChild
  }
}

/**
 * Convert ElementData to ViewerTableRow
 */
export function toViewerTableRow(
  element: ElementData,
  column?: TableColumn
): ViewerTableRow {
  // Create base row with element data
  const row: ViewerTableRow = {
    ...element,
    parameters: element.parameters || {},
    column
  }

  // Flatten parameters into top-level properties for table display
  if (element.parameters) {
    Object.entries(element.parameters).forEach(([key, value]) => {
      row[key] = value
    })
  }

  return row as ViewerTableRow
}

/**
 * Type guard for ElementData
 */
export function isElementData(value: unknown): value is ElementData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'type' in value &&
    'parameters' in value &&
    typeof (value as ElementData).id === 'string' &&
    typeof (value as ElementData).type === 'string' &&
    typeof (value as ElementData).parameters === 'object'
  )
}
