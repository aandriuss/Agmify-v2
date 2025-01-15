import type {
  RawParameter,
  AvailableBimParameter,
  AvailableUserParameter,
  SelectedParameter
} from '../parameters/parameter-states'
import type { TableColumn } from '../tables/table-column'

/**
 * Parameter store state interface
 */
export interface ParameterStoreState {
  // Raw parameters from BIM data
  raw: RawParameter[]

  // Available parameters after processing and parent/child categorization
  available: {
    parent: {
      bim: AvailableBimParameter[]
      user: AvailableUserParameter[]
    }
    child: {
      bim: AvailableBimParameter[]
      user: AvailableUserParameter[]
    }
  }

  // Selected parameters for tables
  selected: {
    parent: SelectedParameter[]
    child: SelectedParameter[]
  }

  // Store metadata
  metadata: {
    lastUpdated: number
    processingStatus: 'idle' | 'processing' | 'error'
    error: Error | null
  }
}

/**
 * Parameter store mutations interface
 */
export interface ParameterStoreMutations {
  // Raw parameter mutations
  setRawParameters: (params: RawParameter[]) => void

  // Available parameter mutations
  setAvailableBimParameters: (
    params: AvailableBimParameter[],
    isParent: boolean
  ) => void
  setAvailableUserParameters: (
    params: AvailableUserParameter[],
    isParent: boolean
  ) => void

  // Selected parameter mutations
  setSelectedParameters: (params: SelectedParameter[], isParent: boolean) => void
  updateParameterVisibility: (id: string, visible: boolean) => void
  updateParameterOrder: (id: string, newOrder: number) => void

  // Column mutations
  setColumns: (columns: TableColumn[], isParent: boolean) => void
  updateColumnWidth: (id: string, width: number) => void

  // Status mutations
  setProcessingStatus: (status: 'idle' | 'processing' | 'error') => void
  setError: (error: Error | null) => void

  // Bulk operations
  reset: () => void
}

/**
 * Parameter store getters interface
 */
export interface ParameterStoreGetters {
  // Raw parameter getters
  rawParameters: RawParameter[]

  // Available parameter getters
  parentAvailableBimParameters: AvailableBimParameter[]
  parentAvailableUserParameters: AvailableUserParameter[]
  childAvailableBimParameters: AvailableBimParameter[]
  childAvailableUserParameters: AvailableUserParameter[]

  // Selected parameter getters
  parentSelectedParameters: SelectedParameter[]
  childSelectedParameters: SelectedParameter[]

  // Column getters
  parentColumns: TableColumn[]
  childColumns: TableColumn[]

  // Filtered getters
  visibleParentColumns: TableColumn[]
  visibleChildColumns: TableColumn[]
  systemParameters: AvailableBimParameter[]
  userParameters: AvailableUserParameter[]

  // Status getters
  isProcessing: boolean
  hasError: boolean
  lastUpdated: number
}

/**
 * Parameter store interface
 */
export interface ParameterStore {
  state: ParameterStoreState
  mutations: ParameterStoreMutations
  getters: ParameterStoreGetters
}

/**
 * Default state factory
 */
export const createDefaultParameterStoreState = (): ParameterStoreState => ({
  raw: [],
  available: {
    parent: {
      bim: [],
      user: []
    },
    child: {
      bim: [],
      user: []
    }
  },
  selected: {
    parent: [],
    child: []
  },
  metadata: {
    lastUpdated: Date.now(),
    processingStatus: 'idle',
    error: null
  }
})
