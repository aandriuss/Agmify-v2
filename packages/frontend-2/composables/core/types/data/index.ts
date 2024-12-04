import type { ParameterValuesRecord } from '..'

/**
 * Column definition for tables
 */
export interface ColumnDef {
  id: string
  name: string
  field: string
  header?: string
  type?: string
  source?: string
  category?: string
  visible?: boolean
  order?: number
  width?: number
  sortable?: boolean
  filterable?: boolean
  metadata?: Record<string, unknown>
  headerComponent?: string
  fetchedGroup?: string
  currentGroup?: string
  isFetched?: boolean
  description?: string
  isFixed?: boolean
  isCustomParameter?: boolean
  parameterRef?: string
  color?: string
  expander?: boolean
  removable?: boolean
}

/**
 * Base element data interface
 */
export interface ElementData {
  id: string
  name?: string
  type: string
  mark: string
  category: string
  parameters: ParameterValuesRecord
  metadata?: Record<string, unknown>
  details?: ElementData[]
  _visible?: boolean
  host?: string
  _raw?: unknown
}

/**
 * Table row interface extending element data
 */
export interface TableRow extends Omit<ElementData, 'details'> {
  details?: TableRow[] // Nested rows for hierarchical tables
  visible?: boolean
  selected?: boolean
  isChild?: boolean
}

/**
 * Table configuration interface
 */
export interface TableConfig {
  id: string
  name: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  metadata?: string
  categoryFilters?: CategoryFilters
}

/**
 * Named table configuration interface
 */
export interface NamedTableConfig extends TableConfig {
  displayName: string
  description?: string
}

/**
 * Table state interface
 */
export interface TableState {
  selectedRows: Set<string>
  expandedRows: Set<string>
  sortBy?: {
    field: string
    direction: 'asc' | 'desc'
  }
  filters?: Record<string, unknown>
}

/**
 * Column group for organizing related columns
 */
export interface ColumnGroup {
  id: string
  name: string
  columns: ColumnDef[]
  metadata?: Record<string, unknown>
}

/**
 * Table update payload interface
 */
export interface TableUpdatePayload {
  tableId: string
  tableName: string
  data?: unknown
}

/**
 * Category definition interface
 */
export interface CategoryDefinition {
  id: string
  name: string
  parent?: string
  description?: string
  metadata?: Record<string, unknown>
  order?: number
  visible?: boolean
}

/**
 * Processed data interface for internal use
 */
export interface ProcessedData extends ElementData {
  processed: {
    [key: string]: unknown
  }
  errors?: {
    [key: string]: string
  }
}

/**
 * Display data interface for UI rendering
 */
export interface DisplayData extends ProcessedData {
  display: {
    [key: string]: string | number | boolean | null
  }
  visible: boolean
  selected?: boolean
}

/**
 * Category filters interface
 */
export interface CategoryFilters {
  selectedParentCategories: string[]
  selectedChildCategories: string[]
}

/**
 * Elements processing state interface
 */
export interface ElementsProcessingState {
  processed: boolean
  loading: boolean
  error?: Error
}

/**
 * Elements data return interface
 */
export interface ElementsDataReturn {
  scheduleData: ElementData[]
  tableData: TableRow[]
  availableCategories: {
    parent: Set<string>
    child: Set<string>
  }
  updateCategories: (
    parentCategories: string[],
    childCategories: string[]
  ) => Promise<void>
  initializeData: () => Promise<void>
  stopWorldTreeWatch: () => void
  isLoading: boolean
  hasError: boolean
  processingState: {
    isProcessingElements: boolean
    processedCount: number
    totalCount: number
    error?: Error
  }
  rawElements: ElementData[]
  parentElements: ElementData[]
  childElements: ElementData[]
  matchedElements: ElementData[]
  orphanedElements: ElementData[]
}

/**
 * Table type settings interface
 */
export interface TableTypeSettings {
  type: 'viewer' | 'schedule' | 'custom'
  defaultColumns: ColumnDef[]
  categoryFilters?: CategoryFilters
}

/**
 * Table instance state interface
 */
export interface TableInstanceState {
  id: string
  type: string
  name: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  categoryFilters: CategoryFilters
  version: number
  lastUpdated: number
}

/**
 * Table registry interface
 */
export interface TableRegistry {
  tables: Map<string, TableInstanceState>
  typeSettings: Map<string, TableTypeSettings>
}

/**
 * Table update operation payloads
 */
export interface TableUpdateOperationPayloads {
  ADD_COLUMN: {
    column: ColumnDef
  }
  REMOVE_COLUMN: {
    columnId: string
  }
  REORDER_COLUMN: {
    columnId: string
    newIndex: number
  }
  UPDATE_VISIBILITY: {
    columnId: string
    visible: boolean
  }
  UPDATE_FILTERS: {
    filters: CategoryFilters
  }
}

/**
 * Table update operation interface
 */
export interface TableUpdateOperation {
  type: keyof TableUpdateOperationPayloads
  tableId: string
  targetView: 'parent' | 'child'
  payload: TableUpdateOperationPayloads[keyof TableUpdateOperationPayloads]
  timestamp: number
}

/**
 * Create named table input interface
 */
export interface CreateNamedTableInput {
  name: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  metadata?: string
  categoryFilters?: CategoryFilters
}

/**
 * Update named table input interface
 */
export interface UpdateNamedTableInput {
  id: string
  name?: string
  parentColumns?: ColumnDef[]
  childColumns?: ColumnDef[]
  metadata?: string
  categoryFilters?: CategoryFilters
}
