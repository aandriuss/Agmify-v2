import { ref, computed, watch, type Ref } from 'vue'
import type {
  ElementsDataReturn,
  ElementData,
  ProcessingState,
  TableRowData,
  ProcessedHeader,
  AvailableHeaders
} from '../types'
import { debug, DebugCategories } from '../utils/debug'
import { useBIMElements } from './useBIMElements'
import { filterElements } from './useElementCategories'
import { processParameters } from './useElementParameters'
import { defaultColumns, defaultTable } from '../config/defaultColumns'
import store from './useScheduleStore'

/**
 * Creates a mutable copy of an array with type safety
 */
function toMutable<T>(arr: readonly T[] | T[]): T[] {
  return Array.isArray(arr) ? [...arr] : []
}

/**
 * Coordinates BIM element data handling between specialized composables.
 * Acts as a facade for useBIMElements, filterElements, and processParameters.
 */
export function useElementsData({
  selectedParentCategories,
  selectedChildCategories
}: {
  selectedParentCategories: Ref<string[]>
  selectedChildCategories: Ref<string[]>
}): ElementsDataReturn & { filteredElements: Ref<ElementData[]> } {
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
  const tableDataRef = ref<TableRowData[]>([])
  const availableHeadersRef = ref<AvailableHeaders>({
    parent: [] as ProcessedHeader[],
    child: [] as ProcessedHeader[]
  })

  // Update filtered elements when source data or categories change
  watch(
    [allElements, selectedParentCategories, selectedChildCategories],
    async ([elements, parentCats, childCats]) => {
      try {
        if (!elements) {
          filteredElementsRef.value = []
          return
        }

        debug.log(DebugCategories.DATA, 'Processing elements:', {
          totalElements: elements.length,
          selectedParentCategories: parentCats,
          selectedChildCategories: childCats
        })

        // Step 1: Filter elements based on categories FIRST
        const { filteredElements } = filterElements({
          allElements: toMutable(elements),
          selectedParent: parentCats,
          selectedChild: childCats
        })

        // Step 2: Process parameters ONLY from filtered elements
        const { processedElements, parameterColumns, availableHeaders } =
          await processParameters({
            filteredElements: toMutable(filteredElements)
          })

        // Step 3: Update filtered elements
        filteredElementsRef.value = toMutable(processedElements)

        // Step 4: Update store with all data at once
        const parameterColumnsWithDefaults = [
          ...defaultColumns,
          ...toMutable(parameterColumns).filter(
            (col) => !defaultColumns.find((d) => d.field === col.field)
          )
        ]

        // Update store state
        await store.lifecycle.update({
          scheduleData: toMutable(processedElements),
          parameterColumns: parameterColumnsWithDefaults,
          availableHeaders: {
            parent: toMutable(availableHeaders.parent),
            child: toMutable(availableHeaders.child)
          }
        })

        // Step 5: Update available headers locally
        availableHeadersRef.value = {
          parent: toMutable(availableHeaders.parent),
          child: toMutable(availableHeaders.child)
        }

        debug.log(DebugCategories.DATA, 'Data pipeline complete', {
          sourceElements: elements.length,
          processedElements: processedElements.length,
          filteredElements: filteredElements.length,
          tableRows: processedElements.length,
          visibleRows: processedElements.filter((row) => row._visible !== false).length,
          parameterColumns: parameterColumns.length,
          availableHeaders: {
            parent: availableHeaders.parent.length,
            child: availableHeaders.child.length
          },
          categories: [...new Set(filteredElements.map((el) => el.category))],
          parentElements: filteredElements.filter((el) => !el.isChild).length,
          childElements: filteredElements.filter((el) => el.isChild).length,
          orphanedElements: filteredElements.filter(
            (el) => el.isChild && (!el.host || el.host === 'Without Host')
          ).length
        })
      } catch (error) {
        debug.error(DebugCategories.ERROR, 'Error updating filtered elements:', error)
        processingState.value.error =
          error instanceof Error ? error : new Error(String(error))
      }
    },
    { immediate: true }
  )

  // Watch store data changes
  watch(
    () => store.scheduleData.value,
    (newData) => {
      try {
        scheduleDataRef.value = toMutable(newData)
      } catch (error) {
        debug.error(DebugCategories.ERROR, 'Error updating schedule data:', error)
      }
    },
    { immediate: true }
  )

  watch(
    () => store.tableData.value,
    (newData) => {
      try {
        tableDataRef.value = toMutable(newData)
      } catch (error) {
        debug.error(DebugCategories.ERROR, 'Error updating table data:', error)
      }
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

      // Step 1: Update local categories
      selectedParentCategories.value = toMutable(parentCategories)
      selectedChildCategories.value = toMutable(childCategories)

      // Step 2: Filter elements with new categories
      const { filteredElements } = filterElements({
        allElements: toMutable(allElements.value),
        selectedParent: parentCategories,
        selectedChild: childCategories
      })

      // Step 3: Process parameters
      const { processedElements, parameterColumns } = await processParameters({
        filteredElements: toMutable(filteredElements)
      })

      // Step 4: Update store with all data at once
      const parameterColumnsWithDefaults = [
        ...defaultColumns,
        ...toMutable(parameterColumns).filter(
          (col) => !defaultColumns.find((d) => d.field === col.field)
        )
      ]

      // Update store state
      await store.lifecycle.update({
        selectedParentCategories: parentCategories,
        selectedChildCategories: childCategories,
        scheduleData: toMutable(processedElements),
        parameterColumns: parameterColumnsWithDefaults
      })

      debug.log(DebugCategories.DATA, 'Categories updated', {
        filteredCount: filteredElements.length,
        processedCount: processedElements.length,
        tableDataCount: processedElements.length,
        parentCategories,
        childCategories
      })
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error updating categories:', error)
      processingState.value.error =
        error instanceof Error ? error : new Error('Failed to update categories')
      throw error
    } finally {
      processingState.value.isUpdatingCategories = false
    }
  }

  // Initialize data with proper order
  async function initializeData(): Promise<void> {
    try {
      processingState.value.isInitializing = true
      processingState.value.error = null

      debug.log(DebugCategories.INITIALIZATION, 'Starting data initialization')

      // Step 1: Initialize store if needed
      if (!store.initialized.value) {
        debug.log(DebugCategories.DATA, 'Initializing store...')
        await store.lifecycle.init()
      }

      // Step 2: Initialize BIM elements
      await initializeElements()

      // Step 3: Set default categories if needed
      const parentCategories =
        selectedParentCategories.value.length === 0 &&
        defaultTable?.categoryFilters?.selectedParentCategories
          ? [...defaultTable.categoryFilters.selectedParentCategories]
          : selectedParentCategories.value

      const childCategories =
        selectedChildCategories.value.length === 0 &&
        defaultTable?.categoryFilters?.selectedChildCategories
          ? [...defaultTable.categoryFilters.selectedChildCategories]
          : selectedChildCategories.value

      // Step 4: Update local categories
      selectedParentCategories.value = toMutable(parentCategories)
      selectedChildCategories.value = toMutable(childCategories)

      // Step 5: Process data if elements are available
      if (allElements.value) {
        // Filter elements based on categories
        const { filteredElements } = filterElements({
          allElements: toMutable(allElements.value),
          selectedParent: parentCategories,
          selectedChild: childCategories
        })

        // Process parameters
        const { processedElements, parameterColumns } = await processParameters({
          filteredElements: toMutable(filteredElements)
        })

        // Update store with all data at once
        const parameterColumnsWithDefaults = [
          ...defaultColumns,
          ...toMutable(parameterColumns).filter(
            (col) => !defaultColumns.find((d) => d.field === col.field)
          )
        ]

        // Update store state
        await store.lifecycle.update({
          selectedParentCategories: parentCategories,
          selectedChildCategories: childCategories,
          scheduleData: toMutable(processedElements),
          parameterColumns: parameterColumnsWithDefaults
        })
      }

      debug.log(DebugCategories.INITIALIZATION, 'Data initialization complete', {
        allElements: allElements.value?.length || 0,
        filteredElements: filteredElementsRef.value.length,
        selectedParentCategories: selectedParentCategories.value,
        selectedChildCategories: selectedChildCategories.value,
        storeData: {
          scheduleData: store.scheduleData.value.length,
          tableData: store.tableData.value.length,
          parameterColumns: store.parameterColumns.value.length,
          mergedTableColumns: store.mergedTableColumns.value.length
        }
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

  return {
    // Core data
    scheduleData: scheduleDataRef,
    tableData: tableDataRef,
    availableHeaders: availableHeadersRef,
    availableCategories: computed(() => ({
      parent: new Set(selectedParentCategories.value),
      child: new Set(selectedChildCategories.value)
    })),

    // Filtered elements (needed by other composables)
    filteredElements: filteredElementsRef,

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
