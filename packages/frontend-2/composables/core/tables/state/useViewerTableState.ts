import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type {
  ElementData,
  ViewerTableRow,
  DataTableState,
  DataTableStateOptions
} from '~/composables/core/types'
import { TableStateError } from '~/composables/core/types/errors'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useDataTableState } from './useDataTableState'
import { useBIMElements } from './useBIMElements'
import { toViewerTableRow } from '~/composables/core/types/elements/elements-base'

export interface ViewerTableStateOptions extends DataTableStateOptions {
  activeParameters?: string[]
}

export interface ViewerTableState extends DataTableState {
  // Additional state
  elements: Ref<ElementData[]>
  rows: Ref<ViewerTableRow[]>
  isInitialized: Ref<boolean>
  hasError: Ref<boolean>
  isLoading: Ref<boolean>

  // Additional methods
  initializeElements: () => Promise<void>
  updateElements: (elements: ElementData[]) => void
  filterElements: (predicate: (element: ElementData) => boolean) => void
  cleanup: () => void
}

/**
 * Viewer table state management
 * Extends DataTable state with viewer-specific functionality
 */
export function useViewerTableState({
  tableId,
  initialState = {},
  activeParameters = [],
  onError,
  onUpdate
}: ViewerTableStateOptions): ViewerTableState {
  // Initialize data table state
  const dataTableState = useDataTableState({
    tableId,
    initialState,
    onError,
    onUpdate
  })

  // Initialize BIM elements
  const {
    allElements,
    isLoading,
    hasError: bimHasError,
    initializeElements: initializeBIMElements,
    stopWorldTreeWatch
  } = useBIMElements()

  // Additional state
  const elements = ref<ElementData[]>([])
  const _isInitialized = ref(false)
  const _hasError = ref(false)

  // Computed state
  const isInitialized = computed(() => _isInitialized.value)
  const hasError = computed(() => _hasError.value || bimHasError.value)
  const rows = computed(() => elements.value.map(toViewerTableRow))

  // Initialize elements
  async function initializeElements(): Promise<void> {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Initializing viewer table', {
        tableId,
        activeParameters
      })

      await initializeBIMElements()
      elements.value = [...allElements.value]
      _isInitialized.value = true

      debug.completeState(DebugCategories.INITIALIZATION, 'Viewer table initialized', {
        elementCount: elements.value.length
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to initialize viewer table:', err)
      _hasError.value = true
      throw err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to initialize viewer table')
    }
  }

  // Update elements
  function updateElements(newElements: ElementData[]): void {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Updating viewer elements', {
        tableId,
        elementCount: newElements.length
      })

      elements.value = [...newElements]
      onUpdate?.()

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Viewer elements updated')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update viewer elements:', err)
      _hasError.value = true
      throw err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to update viewer elements')
    }
  }

  // Filter elements
  function filterElements(predicate: (element: ElementData) => boolean): void {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Filtering viewer elements', {
        tableId
      })

      const filtered = elements.value.filter(predicate)
      elements.value = filtered
      onUpdate?.()

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Viewer elements filtered', {
        filteredCount: filtered.length,
        totalCount: elements.value.length
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to filter viewer elements:', err)
      _hasError.value = true
      throw err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to filter viewer elements')
    }
  }

  // Cleanup
  function cleanup(): void {
    stopWorldTreeWatch()
  }

  return {
    ...dataTableState,
    // Additional state
    elements,
    rows,
    isInitialized,
    hasError,
    isLoading,

    // Additional methods
    initializeElements,
    updateElements,
    filterElements,
    cleanup
  }
}
