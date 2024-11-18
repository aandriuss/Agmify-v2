import { ref, computed, watch, type Ref } from 'vue'
import type {
  ElementsDataReturn,
  ElementData,
  ProcessingState,
  TableRowData,
  ParameterValue,
  ProcessedHeader,
  AvailableHeaders
} from '../types'
import { debug, DebugCategories } from '../utils/debug'
import { useBIMElements } from './useBIMElements'
import { filterElements } from './useElementCategories'
import { processParameters } from './useElementParameters'
import { defaultColumns } from '../config/defaultColumns'
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
    async () => {
      try {
        if (!allElements.value) {
          filteredElementsRef.value = []
          return
        }

        const { filteredElements } = filterElements({
          allElements: toMutable(allElements.value),
          selectedParent: selectedParentCategories.value,
          selectedChild: selectedChildCategories.value
        })

        filteredElementsRef.value = toMutable(filteredElements)

        // Process data pipeline after filtering
        await processDataPipeline()
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

  // Transform ElementData to TableRowData
  function transformToTableData(elements: ElementData[]): TableRowData[] {
    return elements.map((element) => {
      try {
        const rowData: TableRowData = {
          id: element.id,
          mark: element.mark,
          category: element.category,
          type: element.type || '',
          details: element.details ? toMutable(element.details) : [],
          _visible: true,
          data: {} as Record<string, ParameterValue>
        }

        // Add parameter values to data object
        if (element.parameters) {
          Object.entries(element.parameters).forEach(([key, value]) => {
            if (typeof key === 'string') {
              ;(rowData.data as Record<string, ParameterValue>)[key] = value
            }
          })
        }

        return rowData
      } catch (error) {
        debug.error(DebugCategories.ERROR, 'Error transforming element:', error)
        return {
          id: element.id || 'unknown',
          mark: element.mark || 'unknown',
          category: element.category || 'unknown',
          type: '',
          details: [],
          _visible: true,
          data: {}
        }
      }
    })
  }

  // Process data pipeline
  async function processDataPipeline(): Promise<void> {
    if (!allElements.value) {
      debug.warn(DebugCategories.DATA, 'No elements available for processing')
      return
    }

    try {
      processingState.value.isProcessingFullData = true

      // Use all elements if no categories are selected
      const elementsToProcess =
        selectedParentCategories.value.length === 0 &&
        selectedChildCategories.value.length === 0
          ? toMutable(allElements.value)
          : filteredElementsRef.value

      // Step 1: Process parameters from filtered elements
      const { processedElements, parameterColumns, availableHeaders } =
        await processParameters({
          filteredElements: elementsToProcess
        })

      // Step 2: Transform to table data
      const tableData = transformToTableData(toMutable(processedElements))

      // Step 3: Update store and local refs
      await Promise.all([
        store.setScheduleData(toMutable(processedElements)),
        store.setTableData(tableData),
        store.setParameterColumns([
          ...defaultColumns,
          ...toMutable(parameterColumns).filter(
            (col) => !defaultColumns.find((d) => d.field === col.field)
          )
        ])
      ])

      availableHeadersRef.value = {
        parent: toMutable(availableHeaders.parent),
        child: toMutable(availableHeaders.child)
      }

      debug.log(DebugCategories.DATA, 'Data pipeline complete', {
        sourceElements: allElements.value.length,
        filteredElements: filteredElementsRef.value.length,
        processedElements: processedElements.length,
        tableRows: tableData.length,
        parameterColumns: parameterColumns.length,
        availableHeaders: {
          parent: availableHeaders.parent.length,
          child: availableHeaders.child.length
        }
      })
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error processing data:', error)
      processingState.value.error =
        error instanceof Error ? error : new Error('Failed to process data')
      throw error
    } finally {
      processingState.value.isProcessingFullData = false
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
      selectedParentCategories.value = toMutable(parentCategories)
      selectedChildCategories.value = toMutable(childCategories)

      // Wait for filtered elements to update
      await new Promise((resolve) => setTimeout(resolve, 0))

      debug.log(DebugCategories.DATA, 'Categories updated', {
        filteredCount: filteredElementsRef.value.length,
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
        selectedParentCategories: selectedParentCategories.value,
        selectedChildCategories: selectedChildCategories.value
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
      toMutable(filteredElementsRef.value.filter((el) => el.details?.length))
    ),
    orphanedElements: computed(() =>
      toMutable(
        filteredElementsRef.value.filter((el) => el.host && !el.details?.length)
      )
    )
  }
}
