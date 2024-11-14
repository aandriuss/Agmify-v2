import { ref, computed, watch, type Ref } from 'vue'
import type {
  ElementsDataReturn,
  AvailableHeaders,
  ElementData,
  ProcessingState
} from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import { debug, DebugCategories } from '../utils/debug'
import { useBIMElements } from './useBIMElements'
import { useElementCategories } from './useElementCategories'
import { useElementParameters } from './useElementParameters'

/**
 * Coordinates BIM element data handling between specialized composables.
 * Acts as a facade for useBIMElements, useElementCategories, and useElementParameters.
 */
export function useElementsData({
  _currentTableColumns,
  _currentDetailColumns,
  selectedParentCategories,
  selectedChildCategories
}: {
  _currentTableColumns: Ref<ColumnDef[]>
  _currentDetailColumns: Ref<ColumnDef[]>
  selectedParentCategories: Ref<string[]>
  selectedChildCategories: Ref<string[]>
}): ElementsDataReturn {
  // Initialize processing state
  const processingState = ref<ProcessingState>({
    isInitializing: false,
    isProcessingElements: false,
    isUpdatingCategories: false,
    error: null
  })

  // Initialize core data handlers
  const {
    allElements,
    rawWorldTree,
    rawTreeNodes,
    isLoading,
    hasError,
    initializeElements,
    stopWorldTreeWatch
  } = useBIMElements()

  // Create refs for data pipeline
  const filteredElementsRef = ref<ElementData[]>([])
  const processedElementsRef = ref<ElementData[]>([])

  // Initialize parameter state
  const parameterColumns = ref<ColumnDef[]>([])
  const availableHeaders = ref<AvailableHeaders>({
    parent: [],
    child: []
  })

  // Process data pipeline
  function processDataPipeline() {
    if (!allElements.value) return

    // Step 1: Filter elements
    const { filteredElements } = useElementCategories({
      allElements: allElements.value,
      selectedParent: selectedParentCategories.value,
      selectedChild: selectedChildCategories.value
    })
    filteredElementsRef.value = filteredElements

    // Step 2: Process filtered elements
    const {
      processedElements,
      parameterColumns: newColumns,
      availableHeaders: newHeaders
    } = useElementParameters({
      filteredElements: filteredElementsRef.value
    })

    processedElementsRef.value = processedElements
    parameterColumns.value = newColumns.value
    availableHeaders.value = newHeaders.value

    debug.log(DebugCategories.DATA, 'Data pipeline updated', {
      sourceElements: allElements.value.length,
      filteredElements: filteredElements.length,
      processedElements: processedElements.length
    })
  }

  // Watch for changes in source data or categories
  watch(
    [allElements, selectedParentCategories, selectedChildCategories],
    () => {
      processDataPipeline()
    },
    { immediate: true, deep: true }
  )

  // Category update handler
  async function updateCategories(
    parentCategories: string[],
    childCategories: string[]
  ): Promise<void> {
    try {
      processingState.value.isUpdatingCategories = true
      processingState.value.error = null

      debug.log(DebugCategories.DATA, 'Updating categories', {
        parentCategories,
        childCategories,
        currentElements: allElements.value?.length || 0
      })

      if (!allElements.value?.length) {
        debug.warn(
          DebugCategories.VALIDATION,
          'No elements available for categorization'
        )
        return
      }

      // Update selected categories
      selectedParentCategories.value = parentCategories
      selectedChildCategories.value = childCategories

      // Process pipeline with new categories
      processDataPipeline()

      debug.log(DebugCategories.DATA, 'Categories updated', {
        filteredCount: filteredElementsRef.value.length,
        processedCount: processedElementsRef.value.length,
        visibleColumns: parameterColumns.value.filter((col) => col.visible).length,
        parentCategories,
        childCategories
      })

      // Simulate async operation for UI feedback
      await new Promise((resolve) => setTimeout(resolve, 0))
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error updating categories:', error)
      processingState.value.error =
        error instanceof Error ? error : new Error('Failed to update categories')
      throw processingState.value.error
    } finally {
      processingState.value.isUpdatingCategories = false
    }
  }

  // Initialize data
  async function initializeData(): Promise<void> {
    try {
      processingState.value.isInitializing = true
      processingState.value.error = null

      debug.log(DebugCategories.INITIALIZATION, 'Starting data initialization')

      // Initialize BIM elements first
      await initializeElements()

      // Update categories if any are selected
      if (
        selectedParentCategories.value.length > 0 ||
        selectedChildCategories.value.length > 0
      ) {
        await updateCategories(
          selectedParentCategories.value,
          selectedChildCategories.value
        )
      }

      debug.log(DebugCategories.INITIALIZATION, 'Data initialization complete', {
        allElements: allElements.value?.length || 0,
        filteredElements: filteredElementsRef.value.length,
        processedElements: processedElementsRef.value.length,
        columns: parameterColumns.value.length,
        selectedParentCategories: selectedParentCategories.value,
        selectedChildCategories: selectedChildCategories.value
      })
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error initializing data:', error)
      processingState.value.error =
        error instanceof Error ? error : new Error('Failed to initialize data')
      throw processingState.value.error
    } finally {
      processingState.value.isInitializing = false
    }
  }

  // Create refs for debug views
  const parentElements = ref<ElementData[]>([])
  const childElements = ref<ElementData[]>([])
  const matchedElements = ref<ElementData[]>([])
  const orphanedElements = ref<ElementData[]>([])

  // Update debug refs when filtered elements change
  watch(
    () => filteredElementsRef.value,
    (elements) => {
      parentElements.value = elements.filter((el: ElementData) => !el.host)
      childElements.value = elements.filter((el: ElementData) => el.host)
      matchedElements.value = elements.filter((el: ElementData) => el.details?.length)
      orphanedElements.value = elements.filter(
        (el: ElementData) => el.host && !el.details?.length
      )
    },
    { immediate: true }
  )

  return {
    // Core data
    scheduleData: processedElementsRef,
    availableHeaders,
    availableCategories: computed(() => ({
      parent: new Set(selectedParentCategories.value),
      child: new Set(selectedChildCategories.value)
    })),

    // Actions
    updateCategories,
    initializeData,
    stopWorldTreeWatch,

    // State
    isLoading,
    hasError,
    processingState,

    // Raw data for debugging
    rawWorldTree,
    rawTreeNodes,

    // Debug properties
    rawElements: allElements,
    parentElements,
    childElements,
    matchedElements,
    orphanedElements
  }
}
