import { ref, computed, watch } from 'vue'
import type {
  ElementData,
  ProcessingState,
  TableRow,
  ElementsDataReturn,
  ViewerTree
} from '../types'
import { useDebug, DebugCategories } from '../debug/useDebug'
import { useBIMElements } from './useBIMElements'
import { processDataPipeline } from '../utils/dataPipeline'
import { useStore } from '../core/store'

/**
 * Coordinates BIM element data handling between viewer and store.
 * Since we're inside the viewer component, BIM data is already loaded.
 */
export function useElementsData({
  selectedParentCategories,
  selectedChildCategories
}: {
  selectedParentCategories: Ref<string[]>
  selectedChildCategories: Ref<string[]>
}): ElementsDataReturn {
  const debug = useDebug()
  const store = useStore()
  const {
    allElements,
    rawWorldTree,
    rawTreeNodes,
    isLoading: bimLoading,
    hasError: bimError,
    stopWorldTreeWatch,
    initializeElements
  } = useBIMElements()

  // Initialize processing state
  const processingState = ref<ProcessingState>({
    isInitializing: false,
    isProcessingElements: false,
    isUpdatingCategories: false,
    isProcessingFullData: false,
    error: null
  })

  // Create refs for data
  const filteredElementsRef = ref<ElementData[]>([])
  const scheduleDataRef = ref<ElementData[]>([])
  const tableDataRef = ref<TableRow[]>([])

  // Update data when source data or categories change
  const updateData = async (elements: ElementData[]) => {
    try {
      if (!elements?.length) {
        debug.warn(DebugCategories.DATA, 'No elements available for processing')
        filteredElementsRef.value = []
        return
      }

      debug.startState(DebugCategories.DATA_TRANSFORM, 'Processing data', {
        elementCount: elements.length
      })
      processingState.value.isProcessingElements = true

      // Process data through unified pipeline
      const result = processDataPipeline({
        allElements: elements,
        selectedParent: selectedParentCategories.value,
        selectedChild: selectedChildCategories.value
      })

      // Update store with processed data
      await store.lifecycle.update({
        scheduleData: result.filteredElements,
        evaluatedData: result.processedElements,
        tableData: result.tableData,
        parameterColumns: result.parameterColumns,
        currentTableColumns: result.parameterColumns,
        mergedTableColumns: result.parameterColumns,
        currentDetailColumns: result.parameterColumns,
        mergedDetailColumns: result.parameterColumns,
        // Preserve table settings
        selectedTableId: store.selectedTableId.value,
        currentTableId: store.currentTableId.value,
        tableName: store.tableName.value,
        tableKey: store.tableKey.value,
        tablesArray: store.tablesArray.value,
        initialized: true
      })

      // Update local refs
      filteredElementsRef.value = result.filteredElements
      scheduleDataRef.value = result.filteredElements
      tableDataRef.value = result.tableData

      debug.completeState(DebugCategories.DATA_TRANSFORM, 'Data processing complete', {
        filteredCount: result.filteredElements.length,
        processedCount: result.processedElements.length,
        columnCount: result.parameterColumns.length
      })
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error processing data:', error)
      processingState.value.error =
        error instanceof Error ? error : new Error(String(error))
    } finally {
      processingState.value.isProcessingElements = false
    }
  }

  // Watch for BIM elements changes
  watch(
    () => allElements.value,
    async (newElements) => {
      if (newElements?.length) {
        await updateData(newElements)
      }
    },
    { immediate: true }
  )

  // Watch for category changes
  watch([selectedParentCategories, selectedChildCategories], async (_categories) => {
    if (allElements.value?.length) {
      await updateData(allElements.value)
    }
  })

  // Initialize data with current categories
  async function initializeData(): Promise<void> {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Initializing data')
      processingState.value.isInitializing = true

      // Initialize elements with current child categories
      await initializeElements(undefined, selectedChildCategories.value)

      if (allElements.value?.length) {
        await updateData(allElements.value)
      }

      debug.completeState(
        DebugCategories.INITIALIZATION,
        'Data initialization complete'
      )
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
      debug.startState(DebugCategories.CATEGORY_UPDATES, 'Updating categories')
      processingState.value.isUpdatingCategories = true
      processingState.value.error = null

      // First reinitialize elements with new categories
      await initializeElements(undefined, childCategories)

      if (!allElements.value?.length) {
        debug.warn(
          DebugCategories.DATA,
          'Waiting for elements before updating categories'
        )
        return
      }

      // Process data with new categories
      const result = processDataPipeline({
        allElements: allElements.value,
        selectedParent: parentCategories,
        selectedChild: childCategories
      })

      // Preserve existing column settings
      const mergedColumns = result.parameterColumns.map((newCol) => {
        const existingCol = store.mergedTableColumns.value.find(
          (col) => col.field === newCol.field
        )
        if (existingCol) {
          return {
            ...newCol,
            visible: existingCol.visible,
            order: existingCol.order,
            isFetched: existingCol.isFetched,
            isFixed: existingCol.isFixed,
            isCustomParameter: existingCol.isCustomParameter
          }
        }
        return newCol
      })

      // Update store with processed data in one batch while preserving settings
      await store.lifecycle.update({
        selectedParentCategories: parentCategories,
        selectedChildCategories: childCategories,
        scheduleData: result.filteredElements,
        evaluatedData: result.processedElements,
        tableData: result.tableData,
        parameterColumns: mergedColumns,
        // Preserve existing column configurations
        currentTableColumns: store.currentTableColumns.value,
        currentDetailColumns: store.currentDetailColumns.value,
        mergedTableColumns: store.mergedTableColumns.value,
        mergedDetailColumns: store.mergedDetailColumns.value,
        // Preserve table settings
        selectedTableId: store.selectedTableId.value,
        currentTableId: store.currentTableId.value,
        tableName: store.tableName.value,
        tableKey: store.tableKey.value,
        tablesArray: store.tablesArray.value
      })

      // Update local refs
      filteredElementsRef.value = result.filteredElements
      scheduleDataRef.value = result.filteredElements
      tableDataRef.value = result.tableData

      debug.completeState(
        DebugCategories.CATEGORY_UPDATES,
        'Category update complete',
        {
          parentCategories,
          childCategories,
          elementCount: result.filteredElements.length
        }
      )
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
    isLoading: computed(
      () => bimLoading.value || processingState.value.isProcessingElements
    ),
    hasError: computed(() => bimError.value || !!processingState.value.error),
    processingState,
    rawWorldTree: rawWorldTree as Ref<ViewerTree | null>,
    rawTreeNodes,
    rawElements: allElements,
    parentElements: computed(() =>
      filteredElementsRef.value.filter((el) => !el.isChild)
    ),
    childElements: computed(() => filteredElementsRef.value.filter((el) => el.isChild)),
    matchedElements: computed(() =>
      filteredElementsRef.value.filter(
        (el) => el.isChild && el.host && el.host !== 'Without Host'
      )
    ),
    orphanedElements: computed(() =>
      filteredElementsRef.value.filter(
        (el) => el.isChild && (!el.host || el.host === 'Without Host')
      )
    )
  }
}
