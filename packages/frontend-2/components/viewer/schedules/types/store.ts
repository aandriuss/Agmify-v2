import type { ComputedRef, Ref } from 'vue'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'
import type { ElementData } from './elements'
import type { TableRow } from './table'
import type { UnifiedParameter } from './parameters'

export interface StoreState {
  projectId: string | null
  scheduleData: ElementData[]
  evaluatedData: ElementData[]
  tableData: TableRow[]
  customParameters: CustomParameter[]
  // Parent table columns
  parentBaseColumns: ColumnDef[]
  parentAvailableColumns: ColumnDef[]
  parentVisibleColumns: ColumnDef[]
  // Child table columns
  childBaseColumns: ColumnDef[]
  childAvailableColumns: ColumnDef[]
  childVisibleColumns: ColumnDef[]
  // Parameters
  mergedParentParameters: CustomParameter[]
  mergedChildParameters: CustomParameter[]
  processedParameters: Record<string, unknown>
  parameterDefinitions: Record<string, unknown>
  // Headers
  availableHeaders: {
    parent: UnifiedParameter[]
    child: UnifiedParameter[]
  }
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
  // State
  initialized: boolean
  loading: boolean
  error: Error | null
}

export interface Store {
  // Core state
  state: ComputedRef<StoreState>

  // Computed properties
  projectId: ComputedRef<string | null>
  scheduleData: ComputedRef<ElementData[]>
  evaluatedData: ComputedRef<ElementData[]>
  tableData: ComputedRef<TableRow[]>
  parentBaseColumns: ComputedRef<ColumnDef[]>
  parentAvailableColumns: ComputedRef<ColumnDef[]>
  childBaseColumns: ComputedRef<ColumnDef[]>
  childAvailableColumns: ComputedRef<ColumnDef[]>
  mergedParentParameters: ComputedRef<CustomParameter[]>
  mergedChildParameters: ComputedRef<CustomParameter[]>
  processedParameters: ComputedRef<Record<string, unknown>>
  parameterDefinitions: ComputedRef<Record<string, unknown>>
  availableHeaders: ComputedRef<{
    parent: UnifiedParameter[]
    child: UnifiedParameter[]
  }>
  selectedCategories: ComputedRef<Set<string>>
  selectedParentCategories: ComputedRef<string[]>
  selectedChildCategories: ComputedRef<string[]>
  tablesArray: ComputedRef<{ id: string; name: string }[]>
  tableKey: ComputedRef<string>
  initialized: ComputedRef<boolean>
  loading: ComputedRef<boolean>
  error: ComputedRef<Error | null>

  // State properties
  selectedTableId: Ref<string>
  currentTableId: Ref<string>
  tableName: Ref<string>
  parentVisibleColumns: Ref<ColumnDef[]>
  childVisibleColumns: Ref<ColumnDef[]>
  customParameters: Ref<unknown[]>

  // Parameter Methods
  setParameterVisibility: (parameterId: string, visible: boolean) => Promise<void>
  setParameterOrder: (parameterId: string, newOrder: number) => Promise<void>

  // Mutations
  setProjectId: (id: string | null) => Promise<void>
  setScheduleData: (data: ElementData[]) => Promise<void>
  setEvaluatedData: (data: ElementData[]) => Promise<void>
  setTableData: (data: TableRow[]) => Promise<void>
  setCustomParameters: (params: CustomParameter[]) => Promise<void>
  setAvailableHeaders: (headers: {
    parent: UnifiedParameter[]
    child: UnifiedParameter[]
  }) => Promise<void>
  setSelectedCategories: (categories: Set<string>) => Promise<void>
  setParentCategories: (categories: string[]) => Promise<void>
  setChildCategories: (categories: string[]) => Promise<void>
  setTablesArray: (tables: { id: string; name: string }[]) => Promise<void>
  setTableInfo: (info: {
    selectedTableId?: string
    tableName?: string
  }) => Promise<void>
  setColumns: (
    parentColumns: ColumnDef[],
    childColumns: ColumnDef[],
    type: 'base' | 'available' | 'visible'
  ) => Promise<void>
  setInitialized: (value: boolean) => Promise<void>
  setLoading: (value: boolean) => Promise<void>
  setError: (error: Error | null) => Promise<void>

  // Lifecycle
  lifecycle: {
    init: () => Promise<void>
    update: (state: Partial<StoreState>) => Promise<void>
    cleanup: () => void
  }
}
