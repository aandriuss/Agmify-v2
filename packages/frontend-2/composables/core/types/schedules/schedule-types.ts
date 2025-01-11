import type { ParameterMetadata } from '../parameters/parameter-states'
import type { BimValueType, UserValueType, ParameterValue } from '../parameters'
import type { BaseTableRow } from '~/components/tables/DataTable/types'
import type { CategoryTableRow } from '../tables/category-types'
import { createBaseItem } from '../common/base-types'

/**
 * Schedule row interface representing a row in the schedule table
 * This is a display-focused type that combines parameter data with UI state
 */
export interface ScheduleRow extends Omit<BaseTableRow, 'metadata'>, CategoryTableRow {
  // Core parameter properties
  kind: 'bim' | 'user'
  type: BimValueType | UserValueType
  group: string
  name: string

  // Display properties
  visible: boolean
  order: number
  selected: boolean
  expanded?: boolean

  // Required base properties
  id: string
  field: string
  header: string
  removable: boolean

  // Parameter data
  parameters: Record<string, ParameterValue>

  // Optional properties
  category?: string
  description?: string
  metadata?: ParameterMetadata

  // Child parameters (for nested structures)
  children?: ScheduleRow[]
}

/**
 * Schedule table state interface
 */
export interface ScheduleTableState {
  selectedRows: string[]
  expandedRows: string[]
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  filterText?: string
}

/**
 * Schedule category state interface
 */
export interface ScheduleCategoryState {
  selectedParentCategories: string[]
  selectedChildCategories: string[]
}

// Type guards
export const isScheduleRow = (row: unknown): row is ScheduleRow => {
  if (!row || typeof row !== 'object') return false
  const r = row as Partial<ScheduleRow>
  return (
    typeof r.id === 'string' &&
    typeof r.name === 'string' &&
    (r.kind === 'bim' || r.kind === 'user') &&
    typeof r.visible === 'boolean' &&
    typeof r.order === 'number' &&
    typeof r.selected === 'boolean' &&
    typeof r.group === 'string' &&
    typeof r.field === 'string' &&
    typeof r.header === 'string' &&
    typeof r.removable === 'boolean' &&
    typeof r.parameters === 'object'
  )
}

/**
 * Convert a BaseTableRow to a ScheduleRow
 */
export const baseTableRowToScheduleRow = (row: BaseTableRow): ScheduleRow => {
  const base = createBaseItem({
    id: row.id,
    name: row.name,
    field: row.field || row.id,
    header: row.header || row.name,
    removable: row.removable,
    metadata: row.metadata,
    category: (row.metadata as ParameterMetadata)?.category
  })

  return {
    ...base,
    id: base.id,
    name: base.name,
    field: base.field!,
    header: base.header!,
    removable: base.removable,
    category: base.category,
    kind: 'bim', // Default to BIM parameter
    type: 'string', // Default to string type
    group: 'Parameters',
    visible: true,
    order: 0,
    selected: false,
    parameters: {},
    metadata: row.metadata as ParameterMetadata | undefined
  }
}

/**
 * Convert a ScheduleRow to a BaseTableRow
 */
export const scheduleRowToBaseTableRow = (row: ScheduleRow): BaseTableRow => {
  const base = createBaseItem({
    id: row.id,
    name: row.name,
    field: row.field,
    header: row.header,
    removable: row.removable,
    metadata: {
      ...row.metadata,
      category: row.category
    } as Record<string, unknown>
  })

  return {
    ...base,
    id: base.id,
    name: base.name,
    field: base.field!,
    header: base.header!,
    removable: base.removable,
    [row.field]: row.parameters[row.field] || null
  }
}
