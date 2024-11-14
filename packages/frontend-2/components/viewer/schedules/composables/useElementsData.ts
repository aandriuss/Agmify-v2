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

  const {
    filteredElements,
    availableParentCategories,
    availableChildCategories,
    toggleParentCategory,
    toggleChildCategory,
    resetCategories,
    stopCategoryWatch
  } = useElementCategories({
    allElements: allElements.value
  })

  const {
    parameterColumns,
    availableHeaders: paramHeaders,
    processedElements,
    updateParameterVisibility,
    stopParameterWatch
  } = useElementParameters({
    filteredElements
  })

  // Computed state for UI
  const scheduleData = ref<ElementData[]>(processedElements)
  const availableHeaders = ref<AvailableHeaders>({
    parent: paramHeaders.value.parent,
    child: paramHeaders.value.child
  })

  // Watch for changes in processedElements to update scheduleData
  const stopProcessedElementsWatch = watch(
    () => processedElements,
    (newElements) => {
      scheduleData.value = newElements
    },
    { immediate: true }
  )

  // Watch for changes in parameter headers
  const stopHeadersWatch = watch(
    () => paramHeaders.value,
    (newHeaders) => {
      availableHeaders.value = newHeaders
    },
    { immediate: true }
  )

  // Category update handler
  async function updateCategories(
    parentCategories: string[],
    childCategories: string[]
  ): Promise<void> {
    try {
      processingState.value.isUpdatingCategories = true

      debug.log(DebugCategories.DATA, 'Updating categories', {
        parentCategories,
        childCategories
      })

      // Reset current categories
      resetCategories()

      // Add new categories one by one and wait for each update
      for (const category of parentCategories) {
        await Promise.resolve(toggleParentCategory(category))
      }
      for (const category of childCategories) {
        await Promise.resolve(toggleChildCategory(category))
      }

      // Update parameter visibility based on category changes
      if (parameterColumns.value) {
        parameterColumns.value.forEach((column: ColumnDef) => {
          updateParameterVisibility(column.field, column.visible)
        })
      }

      const visibleColumnCount = parameterColumns.value
        ? parameterColumns.value.filter((col: ColumnDef) => col.visible).length
        : 0

      debug.log(DebugCategories.DATA, 'Categories updated', {
        filteredCount: filteredElements.length,
        processedCount: processedElements.length,
        visibleColumns: visibleColumnCount
      })
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error updating categories:', error)
      throw error
    } finally {
      processingState.value.isUpdatingCategories = false
    }
  }

  // Initialize data
  async function initializeData(): Promise<void> {
    try {
      processingState.value.isInitializing = true

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

      const columnCount = parameterColumns.value ? parameterColumns.value.length : 0

      debug.log(DebugCategories.INITIALIZATION, 'Data initialization complete', {
        allElements: allElements.value.length,
        filteredElements: filteredElements.length,
        processedElements: processedElements.length,
        columns: columnCount
      })
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error initializing data:', error)
      processingState.value.error =
        error instanceof Error ? error : new Error('Failed to initialize data')
      throw error
    } finally {
      processingState.value.isInitializing = false
    }
  }

  // Extend stopWorldTreeWatch to cleanup all watchers
  const originalStopWorldTreeWatch = stopWorldTreeWatch
  const enhancedStopWorldTreeWatch = () => {
    stopProcessedElementsWatch()
    stopCategoryWatch()
    stopParameterWatch()
    stopHeadersWatch()
    originalStopWorldTreeWatch()
  }

  return {
    // Core data
    scheduleData,
    availableHeaders,
    availableCategories: computed(() => ({
      parent: new Set(Array.from(availableParentCategories)),
      child: new Set(Array.from(availableChildCategories))
    })),

    // Actions
    updateCategories,
    initializeData,
    stopWorldTreeWatch: enhancedStopWorldTreeWatch,

    // State
    isLoading,
    hasError,
    processingState,

    // Raw data for debugging
    rawWorldTree,
    rawTreeNodes,

    // Debug properties
    rawElements: allElements,
    parentElements: computed(() => filteredElements.filter((el) => !el.host)),
    childElements: computed(() => filteredElements.filter((el) => el.host)),
    matchedElements: computed(() =>
      filteredElements.filter((el) => el.details?.length)
    ),
    orphanedElements: computed(() =>
      filteredElements.filter((el) => el.host && !el.details?.length)
    )
  }
}
