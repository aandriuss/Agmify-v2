import type { ParameterValue } from '../parameters'
import type { ElementData } from '../elements'

/**
 * Record of parameter values by parameter ID
 */
export type ParameterValuesRecord = Record<string, ParameterValue>

/**
 * Table row interface extending element data
 */
export interface TableRow extends ElementData {
  visible?: boolean
  selected?: boolean
}

/**
 * Processing state interfaces
 */
export interface ProcessingState {
  isProcessingElements: boolean // Changed from isProcessing to match existing usage
  processedCount: number
  totalCount: number
  error?: Error
}

/**
 * Data processing interfaces
 */
export interface ProcessedData extends ElementData {
  processed: Record<string, unknown>
  errors?: Record<string, string>
}

export interface DisplayData extends ProcessedData {
  display: Record<string, string | number | boolean | null>
  visible: boolean
  selected?: boolean
}

/**
 * Data management interfaces
 */
export interface DataState {
  rawElements: ElementData[]
  parentElements: ElementData[]
  childElements: ElementData[]
  matchedElements: ElementData[]
  orphanedElements: ElementData[]
  processingState: ProcessingState
  loading: boolean
  error?: Error
}

export interface DataReturn {
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
  state: DataState
  processingState: ProcessingState
}

// Legacy type aliases for backward compatibility
export type ElementsProcessingState = ProcessingState
export type ElementsDataReturn = DataReturn
