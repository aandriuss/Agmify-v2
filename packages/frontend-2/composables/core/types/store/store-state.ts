import type { ComputedRef, Ref } from 'vue'
import type { Viewer } from '@speckle/viewer'
import type { ElementData, TableRow } from '~/composables/core/types'
import type { TableColumn } from '~/composables/core/types/tables'

/**
 * Table info interface
 */
export interface TableInfo {
  id: string
  name: string
}

/**
 * Table info update payload
 */
export interface TableInfoUpdatePayload {
  selectedTableId?: string
  tableName?: string
  currentTableId?: string
  tableKey?: string
}

/**
 * Headers interface
 */
export interface TableHeaders {
  parent: TableColumn[]
  child: TableColumn[]
}

/**
 * Viewer state interface
 */
export interface ViewerState {
  viewer: {
    instance: Viewer | null
    init: {
      ref: Ref<boolean>
      promise: Promise<void>
    }
    metadata: {
      worldTree: Ref<unknown>
    }
  } | null
}

/**
 * Store state interface
 */
export interface StoreState {
  // Core data
  projectId: string | null
  scheduleData: ElementData[]
  evaluatedData: ElementData[]
  tableData: TableRow[]

  // Current view columns (temporary UI state)
  currentTableColumns: TableColumn[]
  currentDetailColumns: TableColumn[]

  // Headers
  availableHeaders: TableHeaders

  // Categories
  selectedCategories: Set<string>
  selectedParentCategories: string[]
  selectedChildCategories: string[]

  // Table info
  tablesArray: TableInfo[]
  tableName: string
  selectedTableId: string
  currentTableId: string
  tableKey: string

  // Status
  initialized: boolean
  loading: boolean
  error: Error | null
}

/**
 * Store mutations interface
 */
export interface StoreMutations {
  // Core mutations
  setProjectId: (id: string | null) => void
  setScheduleData: (data: ElementData[]) => void
  setEvaluatedData: (data: ElementData[]) => void
  setTableData: (data: TableRow[]) => void

  // Current view column mutations
  setCurrentColumns: (table: TableColumn[], detail: TableColumn[]) => void
  setColumnVisibility: (columnId: string, visible: boolean) => void
  setColumnOrder: (columnId: string, newIndex: number) => void

  // Header mutations
  setAvailableHeaders: (headers: TableHeaders) => void

  // Category mutations
  setSelectedCategories: (categories: Set<string>) => void
  setParentCategories: (categories: string[]) => void
  setChildCategories: (categories: string[]) => void

  // Table mutations
  setTableInfo: (info: TableInfoUpdatePayload) => void
  setTablesArray: (tables: TableInfo[]) => void

  // Element mutations
  setElementVisibility: (elementId: string, visible: boolean) => void

  // Status mutations
  setInitialized: (value: boolean) => void
  setLoading: (value: boolean) => void
  setError: (err: Error | null) => void

  // Data processing
  processData?: () => Promise<void>

  // Reset
  reset: () => void
}

/**
 * Store lifecycle interface
 */
export interface StoreLifecycle {
  init: () => Promise<void>
  update: (state: Partial<StoreState>) => Promise<void>
  cleanup: () => void
}

/**
 * Store interface
 */
export interface Store extends StoreMutations {
  // State
  state: ComputedRef<StoreState>

  // Computed state
  projectId: ComputedRef<string | null>
  scheduleData: ComputedRef<ElementData[]>
  evaluatedData: ComputedRef<ElementData[]>
  tableData: ComputedRef<TableRow[]>

  // Current view columns
  currentTableColumns: ComputedRef<TableColumn[]>
  currentDetailColumns: ComputedRef<TableColumn[]>

  // Headers
  availableHeaders: ComputedRef<TableHeaders>

  // Categories
  selectedCategories: ComputedRef<Set<string>>
  selectedParentCategories: ComputedRef<string[]>
  selectedChildCategories: ComputedRef<string[]>

  // Table info
  tablesArray: ComputedRef<TableInfo[]>
  tableName: ComputedRef<string>
  selectedTableId: ComputedRef<string>
  currentTableId: ComputedRef<string>
  tableKey: ComputedRef<string>

  // Status
  initialized: ComputedRef<boolean>
  loading: ComputedRef<boolean>
  error: ComputedRef<Error | null>

  // Lifecycle
  lifecycle: StoreLifecycle
}
