import type { BaseItem } from '../common/base-types'
import type { ColumnDef } from '../tables/column-types'
import type { EventEmits, EventHandler } from './base-events'
import type { DataTableFilterMeta } from 'primevue/datatable'

/**
 * Column event interfaces
 */
export interface ColumnUpdateEvent {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
}

export interface ColumnResizeEvent {
  element: HTMLElement
  delta: number
}

export interface ColumnReorderEvent {
  dragIndex: number
  dropIndex: number
}

/**
 * Sort event interface
 */
export interface SortEvent {
  field: string
  order: number
}

/**
 * Filter event interface
 */
export interface FilterEvent {
  filters: DataTableFilterMeta
}

/**
 * Table event payloads combining all base events
 */
export interface TableEventPayloads<TRow extends BaseItem = BaseItem> {
  'table-updated': { timestamp: number }
  'update:columns': { columns: ColumnDef[] }
  'update:detail-columns': { columns: ColumnDef[] }
  'update:both-columns': ColumnUpdateEvent
  'column-reorder': ColumnReorderEvent
  'column-resize': ColumnResizeEvent
  'column-visibility-change': { column: ColumnDef; visible: boolean }
  'update:expanded-rows': { rows: TRow[] }
  'row-expand': { row: TRow }
  'row-collapse': { row: TRow }
  sort: SortEvent
  filter: FilterEvent
  error: { error: Error }
  retry: { timestamp: number }
}

/**
 * Parameter-specific event payloads
 */
export interface ParameterEventPayloads<TRow extends BaseItem = BaseItem>
  extends TableEventPayloads<TRow> {
  'create-parameter': { timestamp: number }
  'edit-parameters': { timestamp: number }
  'parameter-click': { parameter: TRow }
  'update:selected-categories': { categories: string[] }
}

/**
 * Schedule-specific event payloads
 */
export interface ScheduleEventPayloads<TRow extends BaseItem = BaseItem>
  extends ParameterEventPayloads<TRow> {
  'schedule-update': { schedule: TRow }
  'category-update': { categories: string[] }
  'parameter-group-update': { groups: Array<{ id: string; parameters: TRow[] }> }
  'update:is-test-mode': { value: boolean }
}

/**
 * Vue emit types for each event category
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
 * Event handlers for each event category
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
const TABLE_EVENTS = new Set(Object.keys({} as TableEventPayloads))
const PARAMETER_EVENTS = new Set(Object.keys({} as ParameterEventPayloads))
const SCHEDULE_EVENTS = new Set(Object.keys({} as ScheduleEventPayloads))

export function isTableEvent<K extends keyof TableEventPayloads>(
  event: string
): event is K {
  return TABLE_EVENTS.has(event)
}

export function isParameterEvent<K extends keyof ParameterEventPayloads>(
  event: string
): event is K {
  return PARAMETER_EVENTS.has(event)
}

export function isScheduleEvent<K extends keyof ScheduleEventPayloads>(
  event: string
): event is K {
  return SCHEDULE_EVENTS.has(event)
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
