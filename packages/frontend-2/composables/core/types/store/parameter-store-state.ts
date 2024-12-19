import type {
  ParameterCollections,
  RawBimParameter,
  AvailableBimParameter,
  AvailableUserParameter,
  SelectedParameter,
  ColumnDefinition
} from '../parameters/parameter-states'

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
  setParentRawParameters: (params: RawBimParameter[]) => void
  setChildRawParameters: (params: RawBimParameter[]) => void

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
  setParentColumnDefinitions: (columns: ColumnDefinition[]) => void
  setChildColumnDefinitions: (columns: ColumnDefinition[]) => void
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
  parentRawParameters: RawBimParameter[]
  parentAvailableBimParameters: AvailableBimParameter[]
  parentAvailableUserParameters: AvailableUserParameter[]
  parentSelectedParameters: SelectedParameter[]
  parentColumnDefinitions: ColumnDefinition[]

  // Child parameter getters
  childRawParameters: RawBimParameter[]
  childAvailableBimParameters: AvailableBimParameter[]
  childAvailableUserParameters: AvailableUserParameter[]
  childSelectedParameters: SelectedParameter[]
  childColumnDefinitions: ColumnDefinition[]

  // Filtered getters
  visibleParentColumns: ColumnDefinition[]
  visibleChildColumns: ColumnDefinition[]
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
      selected: [],
      columns: []
    },
    child: {
      raw: [],
      available: {
        bim: [],
        user: []
      },
      selected: [],
      columns: []
    }
  },
  metadata: {
    lastUpdated: Date.now(),
    processingStatus: 'idle',
    error: null
  }
})
