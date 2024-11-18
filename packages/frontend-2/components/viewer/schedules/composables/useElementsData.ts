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

        // Step 1: Process parameters from all elements
        const { processedElements, parameterColumns, availableHeaders } =
          await processParameters({
            filteredElements: toMutable(elements)
          })

        // Step 2: Filter elements based on categories
        const { filteredElements } = filterElements({
          allElements: toMutable(processedElements),
          selectedParent: parentCats,
          selectedChild: childCats
        })

        filteredElementsRef.value = toMutable(filteredElements)

        // Step 3: Update store with processed data
        await store.setScheduleData(toMutable(filteredElements))
        await store.setParameterColumns([
          ...defaultColumns,
          ...toMutable(parameterColumns).filter(
            (col) => !defaultColumns.find((d) => d.field === col.field)
          )
        ])

        // Step 4: Transform to table data
        const tableData = filteredElements.map((element) => ({
          id: element.id,
          mark: element.mark,
          category: element.category,
          type: element.type || '',
          details: element.details ? toMutable(element.details) : [],
          _visible: true,
          data: Object.entries(element.parameters || {}).reduce((acc, [key, value]) => {
            if (key !== '_groups') {
              acc[key] = value
            }
            return acc
          }, {} as Record<string, ParameterValue>)
        }))

        await store.setTableData(tableData)

        // Step 5: Update available headers
        availableHeadersRef.value = {
          parent: toMutable(availableHeaders.parent),
          child: toMutable(availableHeaders.child)
        }

        debug.log(DebugCategories.DATA, 'Data pipeline complete', {
          sourceElements: elements.length,
          processedElements: processedElements.length,
          filteredElements: filteredElements.length,
          tableRows: tableData.length,
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

      // Update selected categories
      selectedParentCategories.value = toMutable(parentCategories)
      selectedChildCategories.value = toMutable(childCategories)

      // Wait for the watch handler to process the changes
      await new Promise<void>((resolve) => {
        const unwatch = watch(
          [selectedParentCategories, selectedChildCategories],
          () => {
            unwatch()
            resolve()
          },
          { immediate: true }
        )
      })

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

      // Initialize store if needed
      if (!store.initialized.value) {
        debug.log(DebugCategories.DATA, 'Initializing store...')
        await store.lifecycle.init()
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
