import type { DataTableFilterMeta } from 'primevue/datatable'

/**
 * DataTable event types from PrimeVue
 */
export interface DataTableColumnReorderEvent {
  originalEvent: Event
  dragIndex: number
  dropIndex: number
}

/**
 * DataTable column resize event
 */
export interface DataTableColumnResizeEvent {
  element: HTMLElement
  delta: number
}

/**
 * DataTable filter meta type re-export
 */
export type { DataTableFilterMeta }
