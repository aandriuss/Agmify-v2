import type { BaseItem } from '../common/base-types'
import type { BaseTableRow } from '~/components/tables/DataTable/types'
import type { ParameterValue } from '../parameters'

/**
 * Element data interface that extends BaseItem and includes index signature
 */
export interface ElementData extends BaseItem {
  // BaseItem requirements
  id: string
  name: string
  field: string
  header: string
  visible: boolean
  removable: boolean
  order?: number

  // Additional ElementData properties
  type: string
  mark?: string
  category?: string
  parameters: Record<string, ParameterValue>
  metadata?: Record<string, unknown>
  details?: ElementData[]
  _visible?: boolean
  host?: string
  _raw?: unknown
  isChild?: boolean

  // Index signature for dynamic access
  [key: string]: unknown
}

/**
 * Viewer table row that extends BaseTableRow
 */
export interface ViewerTableRow extends BaseTableRow {
  // Include all ElementData properties
  type: string
  mark?: string
  category?: string
  parameters: Record<string, ParameterValue>
  metadata?: Record<string, unknown>
  details?: ElementData[]
  _visible?: boolean
  host?: string
  _raw?: unknown
  isChild?: boolean
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
    // Required BaseItem fields
    id: partial.id,
    name,
    field: partial.field || partial.id,
    header: partial.header || name,
    visible: partial.visible ?? true,
    removable: partial.removable ?? true,
    order: partial.order,

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
export function toViewerTableRow(element: ElementData): ViewerTableRow {
  return {
    ...element,
    // Ensure all BaseTableRow properties are present
    id: element.id,
    name: element.name,
    field: element.field,
    header: element.header,
    visible: element.visible,
    removable: element.removable,
    order: element.order
  }
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
