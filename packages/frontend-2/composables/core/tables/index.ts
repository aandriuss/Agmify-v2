// State Management
export { useTableState } from './state/useTableState'
export { useNamedTableState } from './state/useNamedTableState'
export { useDataTableState } from './state/useDataTableState'
export { useViewerTableState } from './state/useViewerTableState'
export { useColumnState } from './state/useColumnState'

// Table Selection
export { useTableSelection } from './useTableSelection'

// Re-export utilities
export * from './utils'

// Re-export types
export type {
  // Core types
  ColumnDef,
  TableConfig,
  NamedTableConfig,
  TableState,
  TableInstanceState,
  TableRegistry,
  TableTypeSettings,
  TableUpdateOperation,
  TableUpdateOperationPayloads,
  TablesState,
  CategoryFilters,
  SortBy,
  SortByField,
  SortDirection,
  UseColumnsOptions,
  TableSettings
} from '../types'

// Re-export state types
export type {
  // Core state types
  TableStateOptions,
  CoreTableState,
  FilterDef,
  // Named table types
  NamedTableStateOptions,
  NamedTableState,
  // DataTable types
  DataTableStateOptions,
  DataTableState
} from '../types/tables/state-types'
