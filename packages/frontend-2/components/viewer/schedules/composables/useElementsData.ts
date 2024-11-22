import { ref, computed, watch, type Ref } from 'vue'
import type {
  ElementData,
  ProcessingState,
  TableRow,
  ElementsDataReturn
} from '../types'
import { debug, DebugCategories } from '../utils/debug'
import { useBIMElements } from './useBIMElements'
import { processDataPipeline } from '../utils/dataPipeline'
import { defaultColumns, defaultDetailColumns } from '../config/defaultColumns'
import store from './useScheduleStore'

/**
 * Creates a mutable copy of an array with type safety
 */
function toMutable<T>(arr: readonly T[] | T[]): T[] {
  return Array.isArray(arr) ? [...arr] : []
}

/**
 * Coordinates BIM element data handling between specialized composables.
 */
export function useElementsData({
  selectedParentCategories,
  selectedChildCategories
}: {
  selectedParentCategories: Ref<string[]>
  selectedChildCategories: Ref<string[]>
}): ElementsDataReturn {
  // Initialize processing state
  const processingState = ref<ProcessingState>({
    isInitializing: false,
    isProcessingElements: false,
    isUpdatingCategories: false,
    isProcessingFullData: false,
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

  // Create refs for data
  const filteredElementsRef = ref<ElementData[]>([])
  const scheduleDataRef = ref<ElementData[]>([])
  const tableDataRef = ref<TableRow[]>([])

  // Initialize with default columns
  store.lifecycle.update({
    currentTableColumns: toMutable(defaultColumns),
    currentDetailColumns: toMutable(defaultDetailColumns)
  })

  // Update data when source data or categories change
  watch(
    [allElements, selectedParentCategories, selectedChildCategories],
    async ([elements, parentCats, childCats]) => {
      try {
        if (!store.initialized.value) {
          debug.log(
            DebugCategories.STATE,
            'Skipping data processing - store not initialized'
          )
          return
        }

        if (!elements?.length) {
          debug.warn(DebugCategories.DATA, 'No elements available for processing')
          filteredElementsRef.value = []
          return
        }

        processingState.value.isProcessingElements = true

        // Process data through unified pipeline
        const result = processDataPipeline({
          allElements: elements,
          selectedParent: parentCats,
          selectedChild: childCats
        })

        // Update store with processed data
        await store.lifecycle.update({
          selectedParentCategories: parentCats,
          selectedChildCategories: childCats,
          scheduleData: result.filteredElements,
          evaluatedData: result.processedElements,
          tableData: result.tableData,
          currentTableColumns: toMutable(result.parameterColumns),
          currentDetailColumns: toMutable(defaultDetailColumns)
        })

        // Update local refs
        filteredElementsRef.value = result.filteredElements
        scheduleDataRef.value = result.filteredElements
        tableDataRef.value = result.tableData
      } catch (error) {
        debug.error(DebugCategories.ERROR, 'Error processing data:', error)
        processingState.value.error =
          error instanceof Error ? error : new Error(String(error))
      } finally {
        processingState.value.isProcessingElements = false
      }
    },
    { immediate: false }
  )

  // Initialize data with proper order
  async function initializeData(): Promise<void> {
    try {
      processingState.value.isInitializing = true
      processingState.value.error = null

      // Step 1: Initialize store if needed
      if (!store.initialized.value) {
        await store.lifecycle.init()
      }

      // Step 2: Initialize BIM elements
      await initializeElements()

      // Step 3: Process initial data
      if (allElements.value?.length) {
        const result = processDataPipeline({
          allElements: allElements.value,
          selectedParent: selectedParentCategories.value,
          selectedChild: selectedChildCategories.value
        })

        // Update store with processed data
        await store.lifecycle.update({
          scheduleData: result.filteredElements,
          evaluatedData: result.processedElements,
          tableData: result.tableData,
          currentTableColumns: toMutable(result.parameterColumns),
          currentDetailColumns: toMutable(defaultDetailColumns)
        })

        // Update local refs
        filteredElementsRef.value = result.filteredElements
        scheduleDataRef.value = result.filteredElements
        tableDataRef.value = result.tableData
      }
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error initializing data:', error)
      processingState.value.error =
        error instanceof Error ? error : new Error('Failed to initialize data')
      throw error
    } finally {
      processingState.value.isInitializing = false
    }
  }

  // Category update handler
  async function updateCategories(
    parentCategories: string[],
    childCategories: string[]
  ): Promise<void> {
    try {
      processingState.value.isUpdatingCategories = true
      processingState.value.error = null

      if (!allElements.value?.length) {
        debug.warn(
          DebugCategories.VALIDATION,
          'No elements available for categorization'
        )
        return
      }

      // Update local categories
      selectedParentCategories.value = toMutable(parentCategories)
      selectedChildCategories.value = toMutable(childCategories)

      // Process data with new categories
      const result = processDataPipeline({
        allElements: allElements.value,
        selectedParent: parentCategories,
        selectedChild: childCategories
      })

      // Update store with processed data
      await store.lifecycle.update({
        selectedParentCategories: parentCategories,
        selectedChildCategories: childCategories,
        scheduleData: result.filteredElements,
        evaluatedData: result.processedElements,
        tableData: result.tableData,
        currentTableColumns: toMutable(result.parameterColumns),
        currentDetailColumns: toMutable(defaultDetailColumns)
      })

      // Update local refs
      filteredElementsRef.value = result.filteredElements
      scheduleDataRef.value = result.filteredElements
      tableDataRef.value = result.tableData
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error updating categories:', error)
      processingState.value.error =
        error instanceof Error ? error : new Error('Failed to update categories')
      throw error
    } finally {
      processingState.value.isUpdatingCategories = false
    }
  }

  return {
    scheduleData: scheduleDataRef,
    tableData: tableDataRef,
    availableCategories: computed(() => ({
      parent: new Set(selectedParentCategories.value),
      child: new Set(selectedChildCategories.value)
    })),
    updateCategories,
    initializeData,
    stopWorldTreeWatch,
    isLoading,
    hasError,
    processingState,
    rawWorldTree,
    rawTreeNodes,
    rawElements: allElements,
    parentElements: computed(() =>
      toMutable(filteredElementsRef.value.filter((el) => !el.isChild))
    ),
    childElements: computed(() =>
      toMutable(filteredElementsRef.value.filter((el) => el.isChild))
    ),
    matchedElements: computed(() =>
      toMutable(
        filteredElementsRef.value.filter(
          (el) => el.isChild && el.host && el.host !== 'Without Host'
        )
      )
    ),
    orphanedElements: computed(() =>
      toMutable(
        filteredElementsRef.value.filter(
          (el) => el.isChild && (!el.host || el.host === 'Without Host')
        )
      )
    )
  }
}
