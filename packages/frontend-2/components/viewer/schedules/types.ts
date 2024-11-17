import type { Ref, ComponentPublicInstance } from 'vue'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { ParameterDefinition } from '~/components/viewer/components/tables/DataTable/composables/parameters/parameterManagement'
import type {
  UserSettings,
  NamedTableConfig,
  CustomParameter
} from '~/composables/useUserSettings'
import type { InitializationState } from './core/composables/useScheduleInitializationFlow'

// Value types
export type BIMNodeValue = string | number | boolean | null | undefined
export type ParameterValue = string | number | boolean | null
export type ParameterValueType = 'string' | 'number' | 'boolean'

// Component emit events
type _ScheduleInitializationEmits = {
  (e: 'error', error: Error): void
  (e: 'update:initialized', value: boolean): void
  (
    e: 'settings-loaded',
    settings: { namedTables: Record<string, NamedTableConfig> }
  ): void
  (e: 'data-initialized'): void
}

// Component props
interface ScheduleInitializationProps {
  initialized: boolean
}

// Component instance type
export interface ScheduleInitializationInstance
  extends ComponentPublicInstance<ScheduleInitializationProps> {
  settings: UserSettings
  updateNamedTable: (id: string, config: Partial<NamedTableConfig>) => Promise<void>
  createNamedTable: (
    name: string,
    config: Omit<NamedTableConfig, 'id' | 'name'>
  ) => Promise<NamedTableConfig>
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
  selectedParentCategories: Ref<string[]>
  selectedChildCategories: Ref<string[]>
  state: Ref<InitializationState>
  handleRetry: () => Promise<void>
}

// Processing state interface
export interface ProcessingState {
  isInitializing: boolean
  isProcessingElements: boolean
  isUpdatingCategories: boolean
  isProcessingFullData: boolean
  error: Error | null
}

// Options for element categories
export interface UseElementCategoriesOptions {
  allElements: ElementData[]
  selectedParent: string[]
  selectedChild: string[]
  essentialFieldsOnly?: boolean
}

// Options for element parameters
export interface UseElementParametersOptions {
  filteredElements: ElementData[]
  essentialFieldsOnly?: boolean
}

// World tree types
export interface WorldTreeNode {
  _root?: {
    type?: string
    children?: TreeItemComponentModel[]
  }
}

export interface ScheduleDataManagementExposed {
  tableData: Ref<TableRowData[]>
  updateRootNodes: (nodes: TreeItemComponentModel[]) => void
}

export interface ScheduleParameterHandlingExposed {
  parameterColumns: Ref<ColumnDef[]>
  evaluatedData: Ref<ElementData[]>
  availableParentParameters: Ref<CustomParameter[]>
  availableChildParameters: Ref<CustomParameter[]>
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

export interface BIMNodeConstraints {
  Host?: string | number | { id?: string | number; Mark?: string; Tag?: string }
  [key: string]: unknown
}

export interface BIMNodeRaw {
  id: string | number
  type?: string
  Name?: string
  Mark?: string
  speckleType?: string
  Tag?: string
  'Identity Data'?: Record<string, unknown>
  Constraints?: {
    Host?: string | number
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
  isChild?: boolean // Added isChild flag to mark elements based on selected categories
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
  // Core data
  scheduleData: Ref<ElementData[]>
  tableData: Ref<TableRowData[]> // Added this line
  availableHeaders: Ref<AvailableHeaders>
  availableCategories: Ref<{
    parent: Set<string>
    child: Set<string>
  }>

  // Actions
  updateCategories: (
    parentCategories: string[],
    childCategories: string[]
  ) => Promise<void>
  initializeData: () => Promise<void>
  stopWorldTreeWatch: () => void

  // State
  isLoading: Ref<boolean>
  hasError: Ref<boolean>
  processingState: Ref<ProcessingState>

  // Raw data for debugging
  rawWorldTree: Ref<WorldTreeNode | null>
  rawTreeNodes: Ref<TreeItemComponentModel[]>

  // Debug properties
  rawElements: Ref<ElementData[]>
  parentElements: Ref<ElementData[]>
  childElements: Ref<ElementData[]>
  matchedElements: Ref<ElementData[]>
  orphanedElements: Ref<ElementData[]>
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

export function isBIMNodeValue(value: unknown): value is BIMNodeValue {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    value === undefined
  )
}

export function isValidBIMNodeRaw(node: unknown): node is BIMNodeRaw {
  if (!node || typeof node !== 'object') return false
  const bimNode = node as Record<string, unknown>
  return (
    (typeof bimNode.id === 'string' || typeof bimNode.id === 'number') &&
    bimNode.id !== undefined
  )
}

// Utility type to ensure ElementData is assignable to Record<string, unknown>
export type TableRowData = ElementData & Record<string, unknown>
