import type { BIMNodeRaw } from './bim'
import type { ParameterValueState } from './parameters'
import type { Ref } from 'vue'
import type { ViewerTree } from './viewer'
import type { TreeItemComponentModel } from '~~/lib/viewer/helpers/sceneExplorer'

// Base parameter type
export interface Parameters {
  [key: string]: ParameterValueState
}

// Core element data with full details
export interface ElementData {
  id: string
  type: string
  mark: string
  category: string
  parameters: Parameters
  details: ElementData[]
  _visible: boolean
  isChild?: boolean
  host?: string
  _raw?: BIMNodeRaw
}

// Table-specific version with optional details
export interface TableRow extends Omit<ElementData, 'details'> {
  details?: TableRow[]
}

// Processing state tracking
export interface ElementsProcessingState {
  isInitializing: boolean
  isProcessingElements: boolean
  isUpdatingCategories: boolean
  isProcessingFullData: boolean
  error: Error | null
}

// Complete return interface for useElementsData
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
  processingState: Ref<ElementsProcessingState>
  rawWorldTree: Ref<ViewerTree | null>
  rawTreeNodes: Ref<TreeItemComponentModel[]>
  rawElements: Ref<ElementData[]>
  parentElements: Ref<ElementData[]>
  childElements: Ref<ElementData[]>
  matchedElements: Ref<ElementData[]>
  orphanedElements: Ref<ElementData[]>
}

export interface ElementsProcessingState {
  isInitializing: boolean
  isProcessingElements: boolean
  isUpdatingCategories: boolean
  isProcessingFullData: boolean
  error: Error | null
}

// Raw element data type - important for initial data coming in
export interface RawElementData {
  id: string
  type: string
  mark: string
  category: string
  parameters?: Parameters
  host?: string
  [key: string]: unknown
}

export interface ProcessedHeader {
  field: string
  header: string
  type: string
  category: string
  description: string
  source: string
  isFetched: boolean
  fetchedGroup: string
  currentGroup: string
}
