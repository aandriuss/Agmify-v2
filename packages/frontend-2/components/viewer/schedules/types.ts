import type { Ref } from 'vue'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { ParameterDefinition } from '~/components/viewer/components/tables/DataTable/composables/parameters/parameterManagement'
import type {
  UserSettings as _UserSettings,
  NamedTableConfig,
  CustomParameter
} from '~/composables/useUserSettings'
import type { InitializationState as _InitializationState } from './core/composables/useScheduleInitializationFlow'

// Value types
export type BIMNodeValue = string | number | boolean | null | undefined
export type ParameterValue = string | number | boolean | null
export type ParameterValueType = 'string' | 'number' | 'boolean'

// Parameter value tracking
export interface ParameterValueState {
  fetchedValue: ParameterValue
  currentValue: ParameterValue
  previousValue: ParameterValue
  userValue: ParameterValue | null
}

// Component instance types
export interface ScheduleInitializationInstance {
  initialized: Ref<boolean>
  loading: Ref<boolean>
  error: Ref<Error | null>
  handleRetry: () => Promise<void>
}

// Parameter types
export type ParametersWithGroups = Record<string, ParameterValue>
export type Parameters = Record<string, ParameterValueState>

// Base element data types
export interface BaseElementData {
  id: string
  mark: string
  category: string
  type?: string
  host?: string
  _visible?: boolean
  isChild?: boolean
  parameters: ParametersWithGroups | Parameters
  [key: string]: unknown
}

// Discovery phase element data
export interface ElementData extends BaseElementData {
  name?: string
  speckle_type?: string
  details?: ElementData[]
  parameters: ParametersWithGroups
  _raw?: Record<string, unknown>
}

// Filtering phase element data
export interface FilteredElementData extends BaseElementData {
  parameters: ParametersWithGroups
  _raw?: Record<string, unknown>
}

// Final data phase element data
export interface TableRow extends BaseElementData {
  parameters: Parameters
  _raw?: Record<string, unknown>
  [key: string]: unknown
}

// BIM types
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
  Constraints?: BIMNodeConstraints
  Other?: {
    Category?: string
    [key: string]: unknown
  }
  parameters?: Record<string, unknown>
  [key: string]: unknown
}

export interface BIMNode {
  raw: BIMNodeRaw
}

export interface TreeItemComponentModel {
  rawNode: BIMNode
  children?: TreeItemComponentModel[]
}

export interface WorldTreeNode {
  _root?: {
    type?: string
    children?: TreeItemComponentModel[]
  }
}

// Header types
export interface ProcessedHeader {
  field: string
  header: string
  fetchedGroup: string // Group from raw data
  currentGroup: string // Current group (initially same as fetchedGroup)
  type: ParameterValueType
  category: string
  description: string
  isFetched: boolean // Whether parameter was fetched from raw data or is custom
  source: string
}

export interface HeaderInfo {
  field: string
  header: string
  fetchedGroup: string
}

export interface AvailableHeaders {
  parent: ProcessedHeader[]
  child: ProcessedHeader[]
}

// Table types
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

// Component types
export interface ScheduleDataManagementExposed {
  tableData: Ref<ElementData[]>
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

// State types
export interface ProcessingState {
  isInitializing: boolean
  isProcessingElements: boolean
  isUpdatingCategories: boolean
  isProcessingFullData: boolean
  error: Error | null
}

// Options types
export interface UseElementParametersOptions {
  filteredElements: ElementData[]
  essentialFieldsOnly?: boolean
  initialColumns?: ColumnDef[]
}

export interface ElementsDataOptions {
  currentTableColumns: { value: ColumnDef[] }
  currentDetailColumns: { value: ColumnDef[] }
  customParameters?: ParameterDefinition[]
}

// Return types
export interface ElementsDataReturn {
  scheduleData: Ref<ElementData[]>
  tableData: Ref<ElementData[]>
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
  stopWorldTreeWatch: () => void
  isLoading: Ref<boolean>
  hasError: Ref<boolean>
  processingState: Ref<ProcessingState>
  rawWorldTree: Ref<WorldTreeNode | null>
  rawTreeNodes: Ref<TreeItemComponentModel[]>
  rawElements: Ref<ElementData[]>
  parentElements: Ref<ElementData[]>
  childElements: Ref<ElementData[]>
  matchedElements: Ref<ElementData[]>
  orphanedElements: Ref<ElementData[]>
}

// Helper functions
export function createParameterValueState(value: ParameterValue): ParameterValueState {
  return {
    fetchedValue: value,
    currentValue: value,
    previousValue: value,
    userValue: null
  }
}

// Type guards
export function isTableRow(value: unknown): value is TableRow {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return (
    typeof data.id === 'string' &&
    typeof data.mark === 'string' &&
    typeof data.category === 'string' &&
    typeof data.parameters === 'object'
  )
}

export function isParameterValueState(value: unknown): value is ParameterValueState {
  if (!value || typeof value !== 'object') return false
  const state = value as Record<string, unknown>
  return (
    'fetchedValue' in state &&
    'currentValue' in state &&
    'previousValue' in state &&
    'userValue' in state
  )
}

export function isElementData(value: unknown): value is ElementData {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return (
    typeof data.id === 'string' &&
    typeof data.mark === 'string' &&
    typeof data.category === 'string' &&
    typeof data.parameters === 'object'
  )
}

export function isProcessedHeader(value: unknown): value is ProcessedHeader {
  if (!value || typeof value !== 'object') return false
  const header = value as Record<string, unknown>
  return (
    typeof header.field === 'string' &&
    typeof header.header === 'string' &&
    typeof header.fetchedGroup === 'string' &&
    typeof header.currentGroup === 'string' &&
    typeof header.type === 'string' &&
    typeof header.category === 'string' &&
    typeof header.description === 'string' &&
    typeof header.isFetched === 'boolean'
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

// Component props
interface _ScheduleInitializationProps {
  initialized: boolean
}

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
