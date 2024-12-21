import { ref, computed, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type {
  ElementData,
  ProcessingState,
  TableRow,
  DataState
} from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from '~/composables/core/store'
import { useTableStore } from '~/composables/core/tables/store/store'
import { useBIMElements } from './useBIMElements'
import { useTableFlow } from '~/composables/core/tables/state/useTableFlow'
import { defaultTableConfig } from '~/composables/core/tables/config/defaults'

interface UseElementsDataOptions {
  selectedParentCategories: Ref<string[]>
  selectedChildCategories: Ref<string[]>
}

interface UseElementsDataReturn {
  scheduleData: ComputedRef<ElementData[]>
  tableData: Ref<TableRow[]>
  availableCategories: {
    parent: Set<string>
    child: Set<string>
  }
  updateCategories: (
    parentCategories: string[],
    childCategories: string[]
  ) => Promise<void>
  initializeData: () => Promise<void>
  elementsMap: Ref<Map<string, ElementData>>
  childElementsList: Ref<ElementData[]>
  isLoading: ComputedRef<boolean>
  hasError: ComputedRef<boolean>
  state: ComputedRef<DataState>
  processingState: Ref<ProcessingState>
  allElements: ComputedRef<ElementData[]>
}

export function useElementsData(
  options: UseElementsDataOptions
): UseElementsDataReturn {
  const store = useStore()
  const tableStore = useTableStore()
  const bimElements = useBIMElements({
    childCategories: options.selectedChildCategories.value
  })
  const elementsMap = ref<Map<string, ElementData>>(new Map())
  const childElementsList = ref<ElementData[]>([])
  const tableData = ref<TableRow[]>([])

  const processingState = ref<ProcessingState>({
    isProcessingElements: false,
    processedCount: 0,
    totalCount: 0,
    error: undefined,
    isProcessingFullData: false
  })

  // Initialize table flow using default config
  const {
    initialize: initializeTable,
    isInitialized: _isInitialized,
    error: _tableError
  } = useTableFlow({
    currentTable: computed(() => tableStore.currentTable.value),
    defaultConfig: {
      ...defaultTableConfig,
      id: `default-table-${Date.now()}` // Ensure unique id for new table
    }
  })

  /**
   * Extract unique parameters from elements
   */
  async function extractParameters() {
    if (!bimElements.allElements.value?.length) {
      debug.warn(DebugCategories.DATA, 'No BIM elements available')
      return
    }

    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Extracting parameters')
      processingState.value.isProcessingElements = true

      // Initialize BIM elements to get parameters
      await bimElements.initializeElements()
      debug.log(DebugCategories.INITIALIZATION, 'BIM elements initialized')

      // Initialize table flow with default config
      debug.log(
        DebugCategories.INITIALIZATION,
        'Initializing table with default parameters',
        {
          defaultParameters: {
            parent: defaultTableConfig.selectedParameters.parent.length,
            child: defaultTableConfig.selectedParameters.child.length
          }
        }
      )
      await initializeTable()

      debug.log(DebugCategories.INITIALIZATION, 'Table initialized with parameters', {
        selectedParameters: {
          parent:
            tableStore.currentTable.value?.selectedParameters?.parent?.length || 0,
          child: tableStore.currentTable.value?.selectedParameters?.child?.length || 0
        }
      })

      debug.completeState(DebugCategories.INITIALIZATION, 'Parameters extracted')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Error extracting parameters:', err)
      processingState.value.error =
        err instanceof Error ? err : new Error('Failed to extract parameters')
      throw err
    } finally {
      processingState.value.isProcessingElements = false
    }
  }

  // Watch category changes
  watch(
    [
      () => options.selectedParentCategories.value,
      () => options.selectedChildCategories.value
    ],
    async ([newParent, newChild], [oldParent, oldChild]) => {
      // Only update if categories actually changed
      if (
        JSON.stringify(newParent) !== JSON.stringify(oldParent) ||
        JSON.stringify(newChild) !== JSON.stringify(oldChild)
      ) {
        debug.log(DebugCategories.CATEGORY_UPDATES, 'Categories changed', {
          oldParent,
          newParent,
          oldChild,
          newChild
        })

        // Skip if already processing
        if (processingState.value.isProcessingElements) {
          debug.warn(DebugCategories.CATEGORY_UPDATES, 'Already processing elements')
          return
        }

        try {
          debug.startState(
            DebugCategories.CATEGORY_UPDATES,
            'Processing category change'
          )
          processingState.value.isProcessingElements = true

          // Update BIM elements with new child categories
          await bimElements.initializeElements()
          debug.log(DebugCategories.CATEGORY_UPDATES, 'BIM elements initialized')

          // Extract parameters with new categories
          await extractParameters()
          debug.log(DebugCategories.CATEGORY_UPDATES, 'Parameters extracted')

          debug.completeState(
            DebugCategories.CATEGORY_UPDATES,
            'Category change processed'
          )
        } catch (err) {
          debug.error(DebugCategories.ERROR, 'Error processing category change:', err)
          processingState.value.error =
            err instanceof Error ? err : new Error('Failed to process category change')
          throw err
        } finally {
          processingState.value.isProcessingElements = false
        }
      }
    },
    { deep: true }
  )

  // Watch for BIM elements changes
  watch(bimElements.allElements, async (newElements, oldElements) => {
    debug.log(DebugCategories.DATA_TRANSFORM, 'BIM elements changed', {
      newCount: newElements?.length,
      oldCount: oldElements?.length,
      processing: processingState.value.isProcessingElements,
      categories: {
        parent: options.selectedParentCategories.value,
        child: options.selectedChildCategories.value
      }
    })

    // Skip initial watch trigger to avoid race conditions
    if (oldElements === undefined) {
      debug.log(DebugCategories.DATA_TRANSFORM, 'Skipping initial watch trigger')
      return
    }

    // Only extract parameters if elements changed and we're not already processing
    if (!processingState.value.isProcessingElements && newElements?.length) {
      await extractParameters()
    }
  })

  const updateCategories = async (
    parentCategories: string[],
    childCategories: string[]
  ): Promise<void> => {
    debug.startState(DebugCategories.CATEGORY_UPDATES, 'Updating categories')

    // Skip if already processing
    if (processingState.value.isProcessingElements) {
      debug.warn(DebugCategories.CATEGORY_UPDATES, 'Already processing elements')
      return
    }

    processingState.value.isProcessingElements = true
    processingState.value.error = undefined

    try {
      debug.log(DebugCategories.CATEGORY_UPDATES, 'Category update started', {
        parentCategories,
        childCategories
      })

      // Update categories using dedicated methods
      store.setParentCategories(parentCategories)
      store.setChildCategories(childCategories)

      // Update BIM elements with new child categories
      await bimElements.initializeElements()
      debug.log(DebugCategories.CATEGORY_UPDATES, 'BIM elements initialized')

      // Extract parameters with new categories
      await extractParameters()
      debug.log(DebugCategories.CATEGORY_UPDATES, 'Parameters extracted')

      debug.completeState(DebugCategories.CATEGORY_UPDATES, 'Categories updated')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Error updating categories:', err)
      processingState.value.error =
        err instanceof Error ? err : new Error('Failed to update categories')
      throw err
    } finally {
      processingState.value.isProcessingElements = false
    }
  }

  const initializeData = async (): Promise<void> => {
    // Skip if already processing
    if (processingState.value.isProcessingElements) {
      debug.warn(DebugCategories.INITIALIZATION, 'Already processing elements')
      return
    }

    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Initializing data')
      processingState.value.isProcessingElements = true

      // Initialize BIM elements to get parameters
      await bimElements.initializeElements()
      debug.log(DebugCategories.INITIALIZATION, 'BIM elements initialized')

      // Extract parameters
      await extractParameters()
      debug.log(DebugCategories.INITIALIZATION, 'Parameters extracted')

      debug.completeState(DebugCategories.INITIALIZATION, 'Data initialized')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Error initializing data:', err)
      processingState.value.error =
        err instanceof Error ? err : new Error('Failed to initialize data')
      throw err
    } finally {
      processingState.value.isProcessingElements = false
    }
  }

  // Computed properties for state
  const isLoading = computed(() => processingState.value.isProcessingElements)
  const hasError = computed(() => !!processingState.value.error)

  const state = computed<DataState>(() => ({
    rawElements: scheduleData.value,
    parentElements: scheduleData.value.filter((el) => !el.isChild),
    childElements: scheduleData.value.filter((el) => el.isChild),
    matchedElements: scheduleData.value.filter(
      (el) => el.isChild && el.host && el.host !== 'No Host'
    ),
    orphanedElements: scheduleData.value.filter(
      (el) => el.isChild && (!el.host || el.host === 'No Host')
    ),
    processingState: processingState.value,
    loading: isLoading.value,
    error: processingState.value.error
  }))

  // Direct reference to store data to avoid redundant transformations
  const scheduleData = computed<ElementData[]>(() => store.scheduleData.value || [])

  return {
    scheduleData,
    tableData,
    availableCategories: {
      parent: new Set(options.selectedParentCategories.value),
      child: new Set(options.selectedChildCategories.value)
    },
    updateCategories,
    initializeData,
    elementsMap,
    childElementsList,
    isLoading,
    hasError,
    state,
    processingState,
    allElements: computed(() => bimElements.allElements.value || [])
  }
}
