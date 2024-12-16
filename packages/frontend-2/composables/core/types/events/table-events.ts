import type { BaseItem } from '../common/base-types'
import type { ColumnDef } from '../tables/column-types'
import type { EventEmits, EventHandler } from './base-events'
import type { DataTableFilterMeta } from 'primevue/datatable'

/**
 * Event payload types
 */
type TimestampPayload = { timestamp: number }
type ColumnsPayload = { columns: ColumnDef[] }
type ColumnVisibilityPayload = { column: ColumnDef; visible: boolean }
type RowPayload<T> = { row: T }
type RowsPayload<T> = { rows: T[] }
type ErrorPayload = { error: Error }
type CategoriesPayload = { categories: string[] }
type ParameterPayload<T> = { parameter: T }
type SchedulePayload<T> = { schedule: T }
type TestModePayload = { value: boolean }
type ParameterGroupPayload<T> = { groups: Array<{ id: string; parameters: T[] }> }

/**
 * Table event payloads
 */
export interface TableEventPayloads<TRow extends BaseItem = BaseItem> {
  'table-updated': TimestampPayload
  'update:columns': ColumnsPayload
  'update:detail-columns': ColumnsPayload
  'update:both-columns': { parentColumns: ColumnDef[]; childColumns: ColumnDef[] }
  'column-reorder': { dragIndex: number; dropIndex: number }
  'column-resize': { element: HTMLElement; delta: number }
  'column-visibility-change': ColumnVisibilityPayload
  'update:expanded-rows': RowsPayload<TRow>
  'row-expand': RowPayload<TRow>
  'row-collapse': RowPayload<TRow>
  sort: { field: string; order: number }
  filter: { filters: DataTableFilterMeta }
  error: ErrorPayload
  retry: TimestampPayload
}

/**
 * Parameter event payloads
 */
export interface ParameterEventPayloads<TRow extends BaseItem = BaseItem>
  extends TableEventPayloads<TRow> {
  'create-parameter': TimestampPayload
  'edit-parameters': TimestampPayload
  'parameter-click': ParameterPayload<TRow>
  'update:selected-categories': CategoriesPayload
}

/**
 * Schedule event payloads
 */
export interface ScheduleEventPayloads<TRow extends BaseItem = BaseItem>
  extends ParameterEventPayloads<TRow> {
  'schedule-update': SchedulePayload<TRow>
  'category-update': CategoriesPayload
  'parameter-group-update': ParameterGroupPayload<TRow>
  'update:is-test-mode': TestModePayload
}

/**
 * Vue emit types
 */
export type TableEmits<TRow extends BaseItem = BaseItem> = EventEmits<
  TableEventPayloads<TRow>
>
export type ParameterEmits<TRow extends BaseItem = BaseItem> = EventEmits<
  ParameterEventPayloads<TRow>
>
export type ScheduleEmits<TRow extends BaseItem = BaseItem> = EventEmits<
  ScheduleEventPayloads<TRow>
>

/**
 * Event handlers
 */
export type TableEventHandler<TRow extends BaseItem = BaseItem> = EventHandler<
  TableEventPayloads<TRow>
>
export type ParameterEventHandler<TRow extends BaseItem = BaseItem> = EventHandler<
  ParameterEventPayloads<TRow>
>
export type ScheduleEventHandler<TRow extends BaseItem = BaseItem> = EventHandler<
  ScheduleEventPayloads<TRow>
>

/**
 * Event type guards
 */
export function isTableEvent(event: string): event is keyof TableEventPayloads {
  return event in ({} as TableEventPayloads)
}

export function isParameterEvent(event: string): event is keyof ParameterEventPayloads {
  return event in ({} as ParameterEventPayloads)
}

export function isScheduleEvent(event: string): event is keyof ScheduleEventPayloads {
  return event in ({} as ScheduleEventPayloads)
}

/**
 * Event creation utility
 */
export function createEvent<T, K extends keyof T>(
  event: K,
  payload: T[K]
): { event: K; payload: T[K] } {
  return { event, payload }
}
