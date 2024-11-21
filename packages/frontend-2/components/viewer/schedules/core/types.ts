import type { ElementData, TableRow, AvailableHeaders } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'
import type { ComputedRef, Ref } from 'vue'
import type { Viewer } from '@speckle/viewer'

export class ValidationError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class InitializationError extends Error {
  constructor(message: string, public recoverable: boolean = true) {
    super(message)
    this.name = 'InitializationError'
  }
}

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

export interface StoreState {
  // Core data
  projectId: string | null
  scheduleData: ElementData[]
  evaluatedData: ElementData[]
  tableData: TableRow[]

  // Parameters
  customParameters: CustomParameter[]
  parameterColumns: ColumnDef[] // Keep for backward compatibility
  parentParameterColumns: ColumnDef[] // New: Parent-specific parameters
  childParameterColumns: ColumnDef[] // New: Child-specific parameters
  mergedParentParameters: CustomParameter[]
  mergedChildParameters: CustomParameter[]
  processedParameters: Record<string, unknown>
  parameterDefinitions: Record<string, unknown>

  // Columns
  currentTableColumns: ColumnDef[]
  currentDetailColumns: ColumnDef[]
  mergedTableColumns: ColumnDef[]
  mergedDetailColumns: ColumnDef[]

  // Headers
  availableHeaders: AvailableHeaders

  // Categories
  selectedCategories: Set<string>
  selectedParentCategories: string[]
  selectedChildCategories: string[]

  // Table info
  tablesArray: { id: string; name: string }[]
  tableName: string
  selectedTableId: string
  currentTableId: string
  tableKey: string

  // Status
  initialized: boolean
  loading: boolean
  error: Error | null
}

export interface StoreMutations {
  // Core mutations
  setProjectId: (id: string | null) => void
  setScheduleData: (data: ElementData[]) => void
  setEvaluatedData: (data: ElementData[]) => void
  setTableData: (data: TableRow[]) => void

  // Parameter mutations
  setCustomParameters: (params: CustomParameter[]) => void
  setParameterColumns: (columns: ColumnDef[]) => void // Keep for backward compatibility
  setParentParameterColumns: (columns: ColumnDef[]) => void // New: Set parent parameters
  setChildParameterColumns: (columns: ColumnDef[]) => void // New: Set child parameters
  setMergedParameters: (parent: CustomParameter[], child: CustomParameter[]) => void
  setProcessedParameters: (params: Record<string, unknown>) => void
  setParameterDefinitions: (defs: Record<string, unknown>) => void
  setParameterVisibility: (parameterId: string, visible: boolean) => void
  setParameterOrder: (parameterId: string, newIndex: number) => void

  // Column mutations
  setCurrentColumns: (table: ColumnDef[], detail: ColumnDef[]) => void
  setMergedColumns: (table: ColumnDef[], detail: ColumnDef[]) => void
  setColumnVisibility: (columnId: string, visible: boolean) => void
  setColumnOrder: (columnId: string, newIndex: number) => void

  // Category mutations
  setSelectedCategories: (categories: Set<string>) => void
  setParentCategories: (categories: string[]) => void
  setChildCategories: (categories: string[]) => void

  // Table mutations
  setTableInfo: (info: {
    selectedTableId?: string
    tableName?: string
    currentTableId?: string
    tableKey?: string
  }) => void
  setTablesArray: (tables: { id: string; name: string }[]) => void

  // Element mutations
  setElementVisibility: (elementId: string, visible: boolean) => void

  // Header mutations
  setAvailableHeaders: (headers: AvailableHeaders) => void

  // Status mutations
  setInitialized: (value: boolean) => void
  setLoading: (value: boolean) => void
  setError: (err: Error | null) => void

  // Data processing
  processData: () => Promise<void>

  // Reset
  reset: () => void
}

export interface StoreLifecycle {
  init: () => Promise<void>
  update: (state: Partial<StoreState>) => Promise<void>
  cleanup: () => void
}

export interface Store {
  // State
  state: ComputedRef<StoreState>

  // Computed state
  projectId: ComputedRef<string | null>
  scheduleData: ComputedRef<ElementData[]>
  evaluatedData: ComputedRef<ElementData[]>
  tableData: ComputedRef<TableRow[]>
  customParameters: ComputedRef<CustomParameter[]>
  parameterColumns: ComputedRef<ColumnDef[]> // Keep for backward compatibility
  parentParameterColumns: ComputedRef<ColumnDef[]> // New: Parent parameters
  childParameterColumns: ComputedRef<ColumnDef[]> // New: Child parameters
  mergedParentParameters: ComputedRef<CustomParameter[]>
  mergedChildParameters: ComputedRef<CustomParameter[]>
  processedParameters: ComputedRef<Record<string, unknown>>
  currentTableColumns: ComputedRef<ColumnDef[]>
  currentDetailColumns: ComputedRef<ColumnDef[]>
  mergedTableColumns: ComputedRef<ColumnDef[]>
  mergedDetailColumns: ComputedRef<ColumnDef[]>
  parameterDefinitions: ComputedRef<Record<string, unknown>>
  availableHeaders: ComputedRef<AvailableHeaders>
  selectedCategories: ComputedRef<Set<string>>
  selectedParentCategories: ComputedRef<string[]>
  selectedChildCategories: ComputedRef<string[]>
  tablesArray: ComputedRef<{ id: string; name: string }[]>
  tableName: ComputedRef<string>
  selectedTableId: ComputedRef<string>
  currentTableId: ComputedRef<string>
  tableKey: ComputedRef<string>
  initialized: ComputedRef<boolean>
  loading: ComputedRef<boolean>
  error: ComputedRef<Error | null>

  // Mutations
  setProjectId: (id: string | null) => void
  setScheduleData: (data: ElementData[]) => void
  setEvaluatedData: (data: ElementData[]) => void
  setTableData: (data: TableRow[]) => void
  setCustomParameters: (params: CustomParameter[]) => void
  setParameterColumns: (columns: ColumnDef[]) => void // Keep for backward compatibility
  setParentParameterColumns: (columns: ColumnDef[]) => void // New: Set parent parameters
  setChildParameterColumns: (columns: ColumnDef[]) => void // New: Set child parameters
  setMergedParameters: (parent: CustomParameter[], child: CustomParameter[]) => void
  setProcessedParameters: (params: Record<string, unknown>) => void
  setParameterDefinitions: (defs: Record<string, unknown>) => void
  setParameterVisibility: (parameterId: string, visible: boolean) => void
  setParameterOrder: (parameterId: string, newIndex: number) => void
  setCurrentColumns: (table: ColumnDef[], detail: ColumnDef[]) => void
  setMergedColumns: (table: ColumnDef[], detail: ColumnDef[]) => void
  setColumnVisibility: (columnId: string, visible: boolean) => void
  setColumnOrder: (columnId: string, newIndex: number) => void
  setSelectedCategories: (categories: Set<string>) => void
  setParentCategories: (categories: string[]) => void
  setChildCategories: (categories: string[]) => void
  setTableInfo: (info: {
    selectedTableId?: string
    tableName?: string
    currentTableId?: string
    tableKey?: string
  }) => void
  setTablesArray: (tables: { id: string; name: string }[]) => void
  setElementVisibility: (elementId: string, visible: boolean) => void
  setAvailableHeaders: (headers: AvailableHeaders) => void
  setInitialized: (value: boolean) => void
  setLoading: (value: boolean) => void
  setError: (err: Error | null) => void
  processData: () => Promise<void>
  reset: () => void

  // Lifecycle
  lifecycle: StoreLifecycle
}
