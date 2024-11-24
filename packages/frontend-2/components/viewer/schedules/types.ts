import type { Ref, ComputedRef } from 'vue'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'

// Core BIM Types
export interface BIMNode {
  raw: BIMNodeRaw
  children?: BIMNode[]
}

export interface DeepBIMNode {
  id?: string
  raw?: BIMNodeRaw
  model?: {
    raw?: BIMNodeRaw
    children?: DeepBIMNode[]
  }
  children?: DeepBIMNode[]
  elements?: DeepBIMNode[]
  atomic?: boolean
  subtreeId?: number
  renderView?: unknown
}

export interface BIMNodeRaw {
  id: string
  speckleType?: string
  type?: string
  Mark?: string
  parameters?: Record<string, unknown>
  Other?: {
    Category?: string
  }
  Constraints?: {
    Host?: string
  }
  [key: string]: unknown
}

// Type guard for BIMNodeRaw
export function isValidBIMNodeRaw(value: unknown): value is BIMNodeRaw {
  if (!value || typeof value !== 'object') return false
  const node = value as Record<string, unknown>
  return typeof node.id === 'string'
}

// Processing State
export interface ProcessingState {
  isInitializing: boolean
  isProcessingElements: boolean
  isUpdatingCategories: boolean
  isProcessingFullData: boolean
  error: Error | null
}

// Element Data Types
export interface ElementsDataReturn {
  scheduleData: Ref<ElementData[]>
  tableData: Ref<TableRow[]>
  availableCategories: Ref<{
    parent: Set<string>
    child: Set<string>
  }>
  updateCategories: (
    parentCategories: string[],
    childCategories: string[]
  ) => Promise<void>
  initializeData: () => Promise<void>
  stopWorldTreeWatch: () => void
  isLoading: Ref<boolean>
  hasError: Ref<boolean>
  processingState: Ref<ProcessingState>
  rawWorldTree: Ref<ViewerTree | null>
  rawTreeNodes: Ref<TreeItemComponentModel[]>
  rawElements: Ref<ElementData[]>
  parentElements: Ref<ElementData[]>
  childElements: Ref<ElementData[]>
  matchedElements: Ref<ElementData[]>
  orphanedElements: Ref<ElementData[]>
}

// Base interface for both ElementData and TableRow
export interface BaseElement {
  id: string
  type: string
  mark: string
  category: string
  parameters: Parameters
  _visible: boolean
  _raw?: BIMNodeRaw
  isChild?: boolean
  host?: string
}

// ElementData extends base with required details array
export interface ElementData extends BaseElement {
  details: ElementData[]
}

// TableRow extends base with optional details array
export interface TableRow extends BaseElement {
  details?: TableRow[]
}

// Parameter Types
export interface Parameters {
  [key: string]: ParameterValueState
}

export interface ParameterValueState {
  fetchedValue: ParameterValue
  currentValue: ParameterValue
  previousValue: ParameterValue
  userValue: ParameterValue
}

export type ParameterValue = string | number | boolean | null

export type ParameterValueType = 'string' | 'number' | 'boolean'

// Helper to create parameter value state
export function createParameterValueState(value: ParameterValue): ParameterValueState {
  return {
    fetchedValue: value,
    currentValue: value,
    previousValue: value,
    userValue: null
  }
}

// Header Types
export interface ProcessedHeader {
  field: string
  header: string
  type: ParameterValueType
  category: string
  description: string
  fetchedGroup: string
  currentGroup: string
  isFetched: boolean
  source: string
}

export interface AvailableHeaders {
  parent: ProcessedHeader[]
  child: ProcessedHeader[]
}

// Tree Types
export interface TreeNode {
  model?: NodeModel
  children?: TreeNode[]
}

export interface NodeModel {
  raw?: BIMNodeRaw
  children?: NodeModel[]
  atomic?: boolean
  id?: string
  speckle_type?: string
  type?: string
}

export interface TreeItemComponentModel {
  id: string
  label: string
  children?: TreeItemComponentModel[]
  data?: unknown
  rawNode?: BIMNode
}

// Viewer Tree Types
export interface ViewerTree {
  _root: {
    model?: {
      raw?: BIMNodeRaw
      children?: NodeModel[]
    }
    children?: TreeNode[]
    isRoot?: () => boolean
    hasChildren?: () => boolean
  }
  getRenderTree: () => unknown
  init?: {
    ref?: {
      value?: boolean
    }
  }
  metadata?: {
    worldTree?: {
      value?: ViewerTree
    }
  }
}

// Store Types
export interface StoreState {
  projectId: string | null
  scheduleData: ElementData[]
  evaluatedData: ElementData[]
  tableData: TableRow[]
  customParameters: CustomParameter[]
  // Parent table columns
  parentBaseColumns: ColumnDef[] // Base columns from PostgreSQL
  parentAvailableColumns: ColumnDef[] // All available columns (including custom)
  parentVisibleColumns: ColumnDef[] // Currently visible columns
  // Child table columns
  childBaseColumns: ColumnDef[] // Base columns from PostgreSQL
  childAvailableColumns: ColumnDef[] // All available columns (including custom)
  childVisibleColumns: ColumnDef[] // Currently visible columns
  // Parameters
  mergedParentParameters: CustomParameter[]
  mergedChildParameters: CustomParameter[]
  processedParameters: Record<string, ProcessedHeader>
  parameterDefinitions: Record<string, ProcessedHeader>
  // Headers
  availableHeaders: {
    parent: ProcessedHeader[]
    child: ProcessedHeader[]
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
  // State
  state: ComputedRef<StoreState>
  projectId: ComputedRef<string | null>
  scheduleData: ComputedRef<ElementData[]>
  evaluatedData: ComputedRef<ElementData[]>
  tableData: ComputedRef<TableRow[]>
  customParameters: ComputedRef<CustomParameter[]>
  // Parent table columns
  parentBaseColumns: ComputedRef<ColumnDef[]>
  parentAvailableColumns: ComputedRef<ColumnDef[]>
  parentVisibleColumns: ComputedRef<ColumnDef[]>
  // Child table columns
  childBaseColumns: ComputedRef<ColumnDef[]>
  childAvailableColumns: ComputedRef<ColumnDef[]>
  childVisibleColumns: ComputedRef<ColumnDef[]>
  // Parameters
  mergedParentParameters: ComputedRef<CustomParameter[]>
  mergedChildParameters: ComputedRef<CustomParameter[]>
  processedParameters: ComputedRef<Record<string, ProcessedHeader>>
  parameterDefinitions: ComputedRef<Record<string, ProcessedHeader>>
  // Headers
  availableHeaders: ComputedRef<{
    parent: ProcessedHeader[]
    child: ProcessedHeader[]
  }>
  // Categories
  selectedCategories: ComputedRef<Set<string>>
  selectedParentCategories: ComputedRef<string[]>
  selectedChildCategories: ComputedRef<string[]>
  // Table info
  tablesArray: ComputedRef<{ id: string; name: string }[]>
  tableName: ComputedRef<string>
  selectedTableId: ComputedRef<string>
  currentTableId: ComputedRef<string>
  tableKey: ComputedRef<string>
  // State
  initialized: ComputedRef<boolean>
  loading: ComputedRef<boolean>
  error: ComputedRef<Error | null>

  // Mutations
  setProjectId: (id: string | null) => void
  setScheduleData: (data: ElementData[]) => void
  setEvaluatedData: (data: ElementData[]) => void
  setTableData: (data: TableRow[]) => void
  setCustomParameters: (params: CustomParameter[]) => void
  setAvailableHeaders: (headers: {
    parent: ProcessedHeader[]
    child: ProcessedHeader[]
  }) => void
  setSelectedCategories: (categories: Set<string>) => void
  setParentCategories: (categories: string[]) => void
  setChildCategories: (categories: string[]) => void
  setTablesArray: (tables: { id: string; name: string }[]) => void
  setTableInfo: (info: { selectedTableId?: string; tableName?: string }) => void
  setColumns: (
    parentColumns: ColumnDef[],
    childColumns: ColumnDef[],
    type: 'base' | 'available' | 'visible'
  ) => void
  setInitialized: (value: boolean) => void
  setLoading: (value: boolean) => void
  setError: (error: Error | null) => void

  // Lifecycle
  lifecycle: {
    init: () => Promise<void>
    update: (state: Partial<StoreState>) => Promise<void>
    cleanup: () => void
  }
}

// Component interfaces
export interface ScheduleDataManagementExposed {
  updateData: () => Promise<void>
}

export interface ScheduleParameterHandlingExposed {
  updateParameters: () => Promise<void>
}

export interface ScheduleColumnManagementExposed {
  updateColumns: () => Promise<void>
}

export interface ScheduleInitializationInstance {
  initialize: () => Promise<void>
}

// Table Types
export interface TableConfig {
  id: string
  name: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  categoryFilters?: {
    selectedParentCategories: string[]
    selectedChildCategories: string[]
  }
  customParameters?: CustomParameter[]
}

export interface TableUpdatePayload {
  tableId: string
  tableName: string
  data?: unknown
}
