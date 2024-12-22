import type {
  ParameterCollections,
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
  collections: ParameterCollections
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
  setParentRawParameters: (params: RawParameter[]) => void
  setChildRawParameters: (params: RawParameter[]) => void

  // Available parameter mutations
  setParentAvailableBimParameters: (params: AvailableBimParameter[]) => void
  setParentAvailableUserParameters: (params: AvailableUserParameter[]) => void
  setChildAvailableBimParameters: (params: AvailableBimParameter[]) => void
  setChildAvailableUserParameters: (params: AvailableUserParameter[]) => void

  // Selected parameter mutations
  setParentSelectedParameters: (params: SelectedParameter[]) => void
  setChildSelectedParameters: (params: SelectedParameter[]) => void
  updateParameterVisibility: (id: string, visible: boolean) => void
  updateParameterOrder: (id: string, newOrder: number) => void

  // Column mutations
  setParentColumns: (columns: TableColumn[]) => void
  setChildColumns: (columns: TableColumn[]) => void
  updateColumnWidth: (id: string, width: number) => void

  // Status mutations
  setProcessingStatus: (status: 'idle' | 'processing' | 'error') => void
  setError: (error: Error | null) => void

  // Bulk operations
  setParameterCollections: (collections: ParameterCollections) => void
  reset: () => void
}

/**
 * Parameter store getters interface
 */
export interface ParameterStoreGetters {
  // Parent parameter getters
  parentRawParameters: RawParameter[]
  parentAvailableBimParameters: AvailableBimParameter[]
  parentAvailableUserParameters: AvailableUserParameter[]
  parentSelectedParameters: SelectedParameter[]
  parentColumns: TableColumn[]

  // Child parameter getters
  childRawParameters: RawParameter[]
  childAvailableBimParameters: AvailableBimParameter[]
  childAvailableUserParameters: AvailableUserParameter[]
  childSelectedParameters: SelectedParameter[]
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
  collections: {
    parent: {
      raw: [],
      available: {
        bim: [],
        user: []
      },
      selected: []
    },
    child: {
      raw: [],
      available: {
        bim: [],
        user: []
      },
      selected: []
    }
  },
  metadata: {
    lastUpdated: Date.now(),
    processingStatus: 'idle',
    error: null
  }
})
