import type {
  DataTableFilterMeta,
  DataTableFilterMetaData,
  DataTableOperatorFilterMetaData,
  DataTableFilterEvent
} from 'primevue/datatable'

/**
 * Re-export PrimeVue filter types for consistency
 */
export type {
  DataTableFilterMeta,
  DataTableFilterMetaData,
  DataTableOperatorFilterMetaData,
  DataTableFilterEvent
}

/**
 * Filter event payload type
 */
export interface FilterEventPayload {
  filters: DataTableFilterMeta
}

/**
 * Helper to create a filter event payload
 */
export function createFilterPayload(event: DataTableFilterEvent): FilterEventPayload {
  return { filters: event.filters }
}

// Export everything from a single point
export default {
  createFilterPayload
}
