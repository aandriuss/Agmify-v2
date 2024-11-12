import type { Ref } from 'vue'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { ParameterDefinition } from '~/components/viewer/components/tables/DataTable/composables/parameters/parameterManagement'
import type {
  UserSettings,
  NamedTableConfig,
  CustomParameter
} from '~/composables/useUserSettings'

export interface ScheduleInitializationExposed {
  settings: Ref<UserSettings>
  updateNamedTable: (
    id: string,
    config: Partial<NamedTableConfig>
  ) => Promise<NamedTableConfig>
  createNamedTable: (
    name: string,
    config: Omit<NamedTableConfig, 'id' | 'name'>
  ) => Promise<string>
  scheduleData: Ref<ElementData[]>
  updateElementsDataCategories: (parent: string[], child: string[]) => Promise<void>
  loadingError: Ref<Error | null>
  selectedTableId: Ref<string>
  tableName: Ref<string>
  currentTableId: Ref<string>
  currentTable: Ref<NamedTableConfig | null>
  handleTableSelection: (id: string) => Promise<void>
  tablesArray: Ref<{ id: string; name: string }[]>
  availableCategories: Ref<{
    parent: Set<string>
    child: Set<string>
  }>
}

export interface ScheduleDataManagementExposed {
  tableData: Ref<TableRowData[]>
  updateRootNodes: (nodes: TreeItemComponentModel[]) => void
}

export interface ScheduleParameterHandlingExposed {
  parameterColumns: Ref<ColumnDef[]>
  evaluatedData: Ref<ElementData[]>
  mergedParentParameters: Ref<CustomParameter[]>
  mergedChildParameters: Ref<CustomParameter[]>
  updateParameterVisibility: (field: string, visible: boolean) => Promise<void>
}

export interface ScheduleColumnManagementExposed {
  currentTableColumns: Ref<ColumnDef[]>
  currentDetailColumns: Ref<ColumnDef[]>
  parameterColumns: Ref<ColumnDef[]>
  updateMergedTableColumns: (columns: ColumnDef[]) => void
  updateMergedDetailColumns: (columns: ColumnDef[]) => void
}

export interface BIMNodeRaw {
  id: string
  type?: string
  Name?: string
  Mark?: string
  mark?: string
  speckle_type?: string
  'Identity Data'?: {
    Mark?: string
    [key: string]: unknown
  }
  Constraints?: {
    Host?: string
    [key: string]: unknown
  }
  Dimensions?: {
    length?: number
    height?: number
    width?: number
    thickness?: number
    area?: number
    [key: string]: unknown
  }
  Other?: {
    Category?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface BIMNode {
  raw: BIMNodeRaw
}

export interface TreeItemComponentModel {
  rawNode: BIMNode
  children?: TreeItemComponentModel[]
}

// Parameter value types
export type ParameterValue = string | number | boolean | null
export type ParameterValueType = 'string' | 'number' | 'boolean'

// Base element data without optional fields
export interface BaseElementData {
  id: string
  mark: string
  category: string
}

// Full element data with all possible fields
export interface ElementData extends BaseElementData {
  type?: string
  name?: string
  host?: string
  details?: ElementData[]
  length?: number
  height?: number
  width?: number
  thickness?: number
  area?: number
  parameters?: Record<string, ParameterValue>
  _visible?: boolean
  [key: string]:
    | ParameterValue
    | ElementData[]
    | undefined
    | string
    | number
    | boolean
    | Record<string, ParameterValue>
    | null
}

export interface ProcessedHeader {
  field: string
  header: string
  source: string
  type: ParameterValueType
  category: string
  description: string
}

export interface HeaderInfo {
  field: string
  header: string
  source: string
}

export interface AvailableHeaders {
  parent: ProcessedHeader[]
  child: ProcessedHeader[]
}

export interface DataOrganization {
  rootNodes: Ref<TreeItemComponentModel[]>
}

export type SpecialFieldMappings = {
  [key: string]: (node: BIMNode) => ParameterValue
}

export interface TableState {
  selectedTableId: string
  tableName: string
  showCategoryOptions: boolean
  showParameterManager: boolean
  expandedRows: string[]
  tableKey: string
  initialized: boolean
  loadingError: Error | null
}

export interface TableConfig {
  id?: string
  name: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  categoryFilters?: {
    selectedParentCategories: string[]
    selectedChildCategories: string[]
  }
  customParameters?: ParameterDefinition[]
  lastUpdateTimestamp?: number
}

export interface TableUpdatePayload {
  tableId: string
  tableName: string
}

export interface ElementsDataOptions {
  currentTableColumns: { value: ColumnDef[] }
  currentDetailColumns: { value: ColumnDef[] }
  customParameters?: ParameterDefinition[]
}

export interface ElementsDataReturn {
  scheduleData: Ref<ElementData[]>
  availableHeaders: Ref<AvailableHeaders>
  availableCategories: Ref<{
    parent: Set<string>
    child: Set<string>
  }>
  updateCategories: (
    parentCategories: string[],
    childCategories: string[]
  ) => Promise<void>
  initializeData: () => Promise<void>
  stopWorldTreeWatch: () => void // Add cleanup function
}

// Debug utility types
export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface DebugOptions {
  validateData: (data: unknown) => data is ElementData[]
  validateColumns: (columns: unknown) => columns is ColumnDef[]
  validateHeader: (header: unknown) => header is ProcessedHeader
  log: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  table: (data: unknown[], columns?: string[]) => void
}

// Type guards
export function isElementData(value: unknown): value is ElementData {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return (
    typeof data.id === 'string' &&
    typeof data.mark === 'string' &&
    typeof data.category === 'string'
  )
}

export function isProcessedHeader(value: unknown): value is ProcessedHeader {
  if (!value || typeof value !== 'object') return false
  const header = value as Record<string, unknown>
  return (
    typeof header.field === 'string' &&
    typeof header.header === 'string' &&
    typeof header.source === 'string' &&
    typeof header.type === 'string' &&
    typeof header.category === 'string' &&
    typeof header.description === 'string'
  )
}

// Utility type to ensure ElementData is assignable to Record<string, unknown>
export type TableRowData = ElementData & Record<string, unknown>
