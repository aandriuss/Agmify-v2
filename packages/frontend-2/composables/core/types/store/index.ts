import type { ComputedRef, Ref } from 'vue'
import type { Viewer } from '@speckle/viewer'
import type { ElementData, TableRow } from '../data'
import type {
  CustomParameter,
  ParameterValueEntry,
  ParameterDefinition
} from '../parameters'
import type { AvailableHeaders, ProcessedHeader } from '../viewer'
import type { ColumnDef } from '../tables'

/**
 * Raw parameter types that can be passed to store mutations
 */
export type RawParameterValue = ProcessedHeader | ParameterValueEntry
export type RawParameterDefinition = ProcessedHeader | ParameterDefinition

/**
 * Base parameter interface that all parameter types extend
 */
export interface BaseParameter {
  id: string
  name: string
  type: string
  value?: unknown
}

/**
 * Store parameter value that extends base parameter
 */
export interface StoreParameterValue extends BaseParameter {
  fetchedValue?: unknown
  currentValue?: unknown
  previousValue?: unknown
  userValue?: unknown
  isValid?: boolean
  error?: string
}

/**
 * Store parameter definition that extends base parameter
 */
export interface StoreParameterDefinition extends BaseParameter {
  field: string
  header?: string
  visible?: boolean
  order?: number
  category?: string
  description?: string
  metadata?: Record<string, unknown>
  removable?: boolean
  isCustomParameter?: boolean
}

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

  // Parameters
  customParameters: CustomParameter[]
  parameterColumns: ColumnDef[] // Keep for backward compatibility
  parentParameterColumns: ColumnDef[] // Parent-specific parameters
  childParameterColumns: ColumnDef[] // Child-specific parameters
  mergedParentParameters: CustomParameter[]
  mergedChildParameters: CustomParameter[]
  processedParameters: Record<string, StoreParameterValue>
  parameterDefinitions: Record<string, StoreParameterDefinition>

  // Columns
  currentTableColumns: ColumnDef[]
  currentDetailColumns: ColumnDef[]
  mergedTableColumns: ColumnDef[]
  mergedDetailColumns: ColumnDef[]
  parentBaseColumns: ColumnDef[]
  parentAvailableColumns: ColumnDef[]
  parentVisibleColumns: ColumnDef[]
  childBaseColumns: ColumnDef[]
  childAvailableColumns: ColumnDef[]
  childVisibleColumns: ColumnDef[]

  // Headers
  availableHeaders: AvailableHeaders

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

  // Parameter mutations
  setCustomParameters: (params: CustomParameter[]) => void
  setParameterColumns: (columns: ColumnDef[]) => void
  setParentParameterColumns: (columns: ColumnDef[]) => void
  setChildParameterColumns: (columns: ColumnDef[]) => void
  setMergedParameters: (parent: CustomParameter[], child: CustomParameter[]) => void
  setProcessedParameters: (params: Record<string, RawParameterValue>) => void
  setParameterDefinitions: (defs: Record<string, RawParameterDefinition>) => void
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
  setTableInfo: (info: TableInfoUpdatePayload) => void
  setTablesArray: (tables: TableInfo[]) => void

  // Element mutations
  setElementVisibility: (elementId: string, visible: boolean) => void

  // Header mutations
  setAvailableHeaders: (headers: AvailableHeaders) => void

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
export interface Store {
  // State
  state: ComputedRef<StoreState>

  // Computed state
  projectId: ComputedRef<string | null>
  scheduleData: ComputedRef<ElementData[]>
  evaluatedData: ComputedRef<ElementData[]>
  tableData: ComputedRef<TableRow[]>
  customParameters: ComputedRef<CustomParameter[]>
  parameterColumns: ComputedRef<ColumnDef[]>
  parentParameterColumns: ComputedRef<ColumnDef[]>
  childParameterColumns: ComputedRef<ColumnDef[]>
  mergedParentParameters: ComputedRef<CustomParameter[]>
  mergedChildParameters: ComputedRef<CustomParameter[]>
  processedParameters: ComputedRef<Record<string, StoreParameterValue>>
  currentTableColumns: ComputedRef<ColumnDef[]>
  currentDetailColumns: ComputedRef<ColumnDef[]>
  mergedTableColumns: ComputedRef<ColumnDef[]>
  mergedDetailColumns: ComputedRef<ColumnDef[]>
  parameterDefinitions: ComputedRef<Record<string, StoreParameterDefinition>>
  availableHeaders: ComputedRef<AvailableHeaders>
  selectedCategories: ComputedRef<Set<string>>
  selectedParentCategories: ComputedRef<string[]>
  selectedChildCategories: ComputedRef<string[]>
  tablesArray: ComputedRef<TableInfo[]>
  tableName: ComputedRef<string>
  selectedTableId: ComputedRef<string>
  currentTableId: ComputedRef<string>
  tableKey: ComputedRef<string>
  initialized: ComputedRef<boolean>
  loading: ComputedRef<boolean>
  error: ComputedRef<Error | null>
  parentBaseColumns: ComputedRef<ColumnDef[]>
  parentAvailableColumns: ComputedRef<ColumnDef[]>
  parentVisibleColumns: ComputedRef<ColumnDef[]>
  childBaseColumns: ComputedRef<ColumnDef[]>
  childAvailableColumns: ComputedRef<ColumnDef[]>
  childVisibleColumns: ComputedRef<ColumnDef[]>

  // Mutations
  setProjectId: (id: string | null) => void
  setScheduleData: (data: ElementData[]) => void
  setEvaluatedData: (data: ElementData[]) => void
  setTableData: (data: TableRow[]) => void
  setCustomParameters: (params: CustomParameter[]) => void
  setParameterColumns: (columns: ColumnDef[]) => void
  setParentParameterColumns: (columns: ColumnDef[]) => void
  setChildParameterColumns: (columns: ColumnDef[]) => void
  setMergedParameters: (parent: CustomParameter[], child: CustomParameter[]) => void
  setProcessedParameters: (params: Record<string, RawParameterValue>) => void
  setParameterDefinitions: (defs: Record<string, RawParameterDefinition>) => void
  setParameterVisibility: (parameterId: string, visible: boolean) => void
  setParameterOrder: (parameterId: string, newIndex: number) => void
  setCurrentColumns: (table: ColumnDef[], detail: ColumnDef[]) => void
  setMergedColumns: (table: ColumnDef[], detail: ColumnDef[]) => void
  setColumnVisibility: (columnId: string, visible: boolean) => void
  setColumnOrder: (columnId: string, newIndex: number) => void
  setSelectedCategories: (categories: Set<string>) => void
  setParentCategories: (categories: string[]) => void
  setChildCategories: (categories: string[]) => void
  setTableInfo: (info: TableInfoUpdatePayload) => void
  setTablesArray: (tables: TableInfo[]) => void
  setElementVisibility: (elementId: string, visible: boolean) => void
  setAvailableHeaders: (headers: AvailableHeaders) => void
  setInitialized: (value: boolean) => void
  setLoading: (value: boolean) => void
  setError: (err: Error | null) => void
  processData?: () => Promise<void>
  reset: () => void

  // Lifecycle
  lifecycle: StoreLifecycle
}

/**
 * Helper functions to convert between parameter types
 */
export function convertToStoreParameterValue(
  source: RawParameterValue,
  id?: string,
  name?: string,
  type?: string
): StoreParameterValue {
  if ('value' in source && 'id' in source && 'name' in source && 'type' in source) {
    // ProcessedHeader
    return {
      id: source.id,
      name: source.name,
      type: source.type,
      value: source.value,
      currentValue: source.value,
      isValid: true
    }
  }
  // ParameterValueEntry
  if (!id || !name || !type) {
    throw new Error('Missing required fields for ParameterValueEntry conversion')
  }
  return {
    id,
    name,
    type,
    value: source.currentValue,
    currentValue: source.currentValue,
    previousValue: source.previousValue,
    userValue: source.userValue,
    fetchedValue: source.fetchedValue,
    isValid: source.isValid,
    error: source.error
  }
}

export function convertToStoreParameterDefinition(
  source: RawParameterDefinition
): StoreParameterDefinition {
  if ('value' in source && 'id' in source) {
    // ProcessedHeader
    return {
      id: source.id,
      name: source.name,
      type: source.type,
      value: source.value,
      field: source.id,
      header: source.name,
      visible: true,
      removable: true,
      isCustomParameter: true
    }
  }
  // ParameterDefinition
  return {
    id: source.field,
    name: source.name,
    type: source.type,
    field: source.field,
    header: source.name,
    visible: true,
    removable: true,
    isCustomParameter: true,
    category: source.category,
    description: source.description,
    metadata: source.metadata
  }
}

export function convertParameterMap<T extends RawParameterValue>(
  params: Record<string, T>
): Record<string, StoreParameterValue> {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      'value' in value && 'id' in value && 'name' in value && 'type' in value
        ? convertToStoreParameterValue(value)
        : convertToStoreParameterValue(value, key, key, 'string')
    ])
  )
}

export function convertDefinitionMap<T extends RawParameterDefinition>(
  defs: Record<string, T>
): Record<string, StoreParameterDefinition> {
  return Object.fromEntries(
    Object.entries(defs).map(([key, value]) => [
      key,
      convertToStoreParameterDefinition(value)
    ])
  )
}

export function createColumnDef(
  source: StoreParameterDefinition | ParameterDefinition
): ColumnDef {
  return {
    id: source.field,
    name: source.name,
    field: `parameters.${source.field}`,
    header: 'header' in source ? source.header : source.name,
    type: source.type,
    visible: source.visible ?? true,
    order: source.order ?? 0,
    removable: 'removable' in source ? source.removable : true,
    category: source.category,
    isCustomParameter: 'isCustomParameter' in source ? source.isCustomParameter : true,
    parameterRef: source.field
  }
}

export function isStoreParameterValue(value: unknown): value is StoreParameterValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'type' in value
  )
}

export function isStoreParameterDefinition(
  value: unknown
): value is StoreParameterDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'type' in value &&
    'field' in value
  )
}
