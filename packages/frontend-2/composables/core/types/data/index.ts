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
 * Column group for organizing related columns
 */
export interface ColumnGroup {
  id: string
  name: string
  columns: ColumnDef[]
  metadata?: Record<string, unknown>
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
