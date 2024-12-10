import type { ColumnDef } from '../tables/column-types'
import type { BaseTableRow } from '~/components/tables/DataTable/types'
import type { DataTableFilterMeta } from 'primevue/datatable'

/**
 * Common event payloads
 */
export interface ColumnUpdateEvent {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
}

export interface ColumnReorderEvent {
  dragIndex: number
  dropIndex: number
}

export interface ColumnResizeEvent {
  element: HTMLElement
  delta: number
}

export interface SortEvent {
  field: string
  order: number
}

export interface ParameterGroupEvent {
  id: string
  parameters: BaseTableRow[]
}

export interface ExpandedRowsEvent<TRow> {
  rows: TRow[]
}

/**
 * Base event map with object types for all events
 */
export interface TableEventMap<TRow extends BaseTableRow = BaseTableRow> {
  // Column Events
  'update:columns': { columns: ColumnDef[] }
  'update:detail-columns': { columns: ColumnDef[] }
  'update:both-columns': ColumnUpdateEvent
  'column-reorder': ColumnReorderEvent
  'column-resize': ColumnResizeEvent
  'column-visibility-change': { visible: boolean }

  // Row Events
  'update:expanded-rows': ExpandedRowsEvent<TRow>
  'row-expand': { row: TRow }
  'row-collapse': { row: TRow }

  // Table Events
  'table-updated': { timestamp: number }
  sort: SortEvent
  filter: { filters: DataTableFilterMeta }
  error: { error: Error }
  retry: { timestamp: number }
}

/**
 * Parameter-specific event map
 */
export interface ParameterEventMap<TRow extends BaseTableRow = BaseTableRow>
  extends TableEventMap<TRow> {
  'create-parameter': { timestamp: number }
  'edit-parameters': { timestamp: number }
  'parameter-click': { parameter: TRow }
  'update:selected-categories': { categories: string[] }
}

/**
 * Schedule-specific event map
 */
export interface ScheduleEventMap<TRow extends BaseTableRow = BaseTableRow>
  extends ParameterEventMap<TRow> {
  'schedule-update': { schedule: TRow }
  'category-update': { categories: string[] }
  'parameter-group-update': { groups: ParameterGroupEvent[] }
}

/**
 * Event handler types
 */
export type TableEventHandler<
  TEvents extends TableEventMap | ParameterEventMap | ScheduleEventMap,
  K extends keyof TEvents
> = (event: TEvents[K]) => void | Promise<void>

/**
 * Emit types for defineEmits
 */
export type TableEmits<TRow extends BaseTableRow = BaseTableRow> = {
  [K in keyof TableEventMap<TRow>]: [TableEventMap<TRow>[K]]
}

export type ParameterEmits<TRow extends BaseTableRow = BaseTableRow> = {
  [K in keyof ParameterEventMap<TRow>]: [ParameterEventMap<TRow>[K]]
}

export type ScheduleEmits<TRow extends BaseTableRow = BaseTableRow> = {
  [K in keyof ScheduleEventMap<TRow>]: [ScheduleEventMap<TRow>[K]]
}

/**
 * Props types for v-model
 */
export interface TableModelProps<TRow extends BaseTableRow = BaseTableRow> {
  columns?: ColumnDef[]
  detailColumns?: ColumnDef[]
  expandedRows?: TRow[]
}

export interface ParameterModelProps<TRow extends BaseTableRow = BaseTableRow>
  extends TableModelProps<TRow> {
  selectedCategories?: string[]
}

/**
 * Table State Types
 */
export interface TableState<TRow extends BaseTableRow = BaseTableRow> {
  columns: ColumnDef[]
  detailColumns?: ColumnDef[]
  expandedRows: TRow[]
  sortField?: string
  sortOrder?: number
  filters?: DataTableFilterMeta
}

/**
 * Event type guards
 */
const TABLE_EVENTS = new Set([
  'update:columns',
  'update:detail-columns',
  'update:both-columns',
  'update:expanded-rows',
  'column-reorder',
  'column-resize',
  'row-expand',
  'row-collapse',
  'table-updated',
  'column-visibility-change',
  'sort',
  'filter',
  'error',
  'retry'
])

const PARAMETER_EVENTS = new Set([
  ...TABLE_EVENTS,
  'create-parameter',
  'edit-parameters',
  'parameter-click',
  'update:selected-categories'
])

const SCHEDULE_EVENTS = new Set([
  ...PARAMETER_EVENTS,
  'schedule-update',
  'category-update',
  'parameter-group-update'
])

export function isTableEvent<K extends keyof TableEventMap>(event: string): event is K {
  return TABLE_EVENTS.has(event)
}

export function isParameterEvent<K extends keyof ParameterEventMap>(
  event: string
): event is K {
  return PARAMETER_EVENTS.has(event)
}

export function isScheduleEvent<K extends keyof ScheduleEventMap>(
  event: string
): event is K {
  return SCHEDULE_EVENTS.has(event)
}

/**
 * Event creation utilities
 */
export function createSortEvent(field: string, order: number): SortEvent {
  return { field, order }
}

export function createColumnUpdateEvent(
  parentColumns: ColumnDef[],
  childColumns: ColumnDef[]
): ColumnUpdateEvent {
  return { parentColumns, childColumns }
}

export function createParameterGroupEvent(
  id: string,
  parameters: BaseTableRow[]
): ParameterGroupEvent {
  return { id, parameters }
}
