import type { ParameterValuesRecord } from '../parameters'
import type { ColumnDef, CategoryFilters, NamedTableConfig } from '../tables'

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

// Re-export types from tables that are used in data contexts
export type { ColumnDef, CategoryFilters, NamedTableConfig }
