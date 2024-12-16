import type { ColumnDef } from '../tables/column-types'
import type { BaseItem } from '../common/base-types'
import type { FilterEventPayload } from '../tables/filter-types'

/**
 * Base event payloads for all events
 */
export interface BaseEventPayloads {
  error: { error: Error }
  retry: { timestamp: number }
}

/**
 * Column-related event payloads
 */
export interface ColumnEventPayloads {
  'update:columns': { columns: ColumnDef[] }
  'update:detail-columns': { columns: ColumnDef[] }
  'update:both-columns': { parentColumns: ColumnDef[]; childColumns: ColumnDef[] }
  'column-reorder': { dragIndex: number; dropIndex: number }
  'column-resize': { element: HTMLElement; delta: number }
  'column-visibility-change': { column: ColumnDef; visible: boolean }
}

/**
 * Row-related event payloads
 */
export interface RowEventPayloads<TRow extends BaseItem = BaseItem> {
  'update:expanded-rows': { rows: TRow[] }
  'row-expand': { row: TRow }
  'row-collapse': { row: TRow }
}

/**
 * Sort and filter event payloads
 */
export interface DataEventPayloads {
  sort: { field: string; order: number }
  filter: FilterEventPayload
}

/**
 * Vue emit type helper - matches Vue's emit type system
 * Maps event names to their payload types in a Vue-compatible format
 */
export type EventEmits<T> = {
  <K extends keyof T>(event: K, payload: T[K]): void
}

/**
 * Helper type for event handlers
 */
export type EventHandler<T> = <K extends keyof T>(event: K, payload: T[K]) => void

/**
 * Helper type for component props that accept event handlers
 */
export type EventHandlerProps<T> = {
  [K in keyof T as `on${Capitalize<string & K>}`]: (payload: T[K]) => void
}
