import { ref, computed, watch, type Ref } from 'vue'
import type {
  ElementsDataReturn,
  AvailableHeaders,
  ElementData,
  ProcessingState,
  TableRowData
} from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import { debug, DebugCategories } from '../utils/debug'
import { useBIMElements } from './useBIMElements'
import { filterElements } from './useElementCategories'
import { processParameters } from './useElementParameters'
import { defaultColumns } from '../config/defaultColumns'

/**
 * Coordinates BIM element data handling between specialized composables.
 * Acts as a facade for useBIMElements, filterElements, and processParameters.
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

  // Create refs for data pipeline
  const filteredElementsRef = ref<ElementData[]>([])
  const processedElementsRef = ref<ElementData[]>([])
  const tableDataRef = ref<TableRowData[]>([])
  const parameterColumnsRef = ref<ColumnDef[]>([])
  const availableHeadersRef = ref<AvailableHeaders>({
    parent: [],
    child: []
  })

  // Transform ElementData to TableRowData
  function transformToTableData(elements: ElementData[]): TableRowData[] {
    return elements.map((element) => {
      const rowData: TableRowData = {
        id: element.id,
        mark: element.mark,
        category: element.category,
        type: element.type,
        details: element.details || [],
        _visible: true
      }

      // Add parameter values as direct properties
      if (element.parameters) {
        Object.entries(element.parameters).forEach(([key, value]) => {
          rowData[key] = value
        })
      }

      return rowData
    })
  }

  // Process essential data first
  function processEssentialData() {
    if (!allElements.value) {
      debug.warn(DebugCategories.DATA, 'No elements available for processing')
      return
    }

    try {
      // Step 1: Filter elements with essential fields only
      const { filteredElements } = filterElements({
        allElements: allElements.value,
        selectedParent: selectedParentCategories.value,
        selectedChild: selectedChildCategories.value,
        essentialFieldsOnly: true
      })
      filteredElementsRef.value = filteredElements

      // Step 2: Process essential fields only
      const { processedElements, parameterColumns, availableHeaders } =
        processParameters({
          filteredElements: filteredElementsRef.value,
          essentialFieldsOnly: true
        })

      processedElementsRef.value = processedElements
      parameterColumnsRef.value = [
        ...defaultColumns,
        ...parameterColumns.filter(
          (col) => !defaultColumns.find((d) => d.field === col.field)
        )
      ]
      availableHeadersRef.value = availableHeaders

      // Step 3: Transform to table data
      tableDataRef.value = transformToTableData(processedElements)

      debug.log(DebugCategories.DATA, 'Essential data processed', {
        sourceElements: allElements.value.length,
        filteredElements: filteredElements.length,
        processedElements: processedElements.length,
        tableRows: tableDataRef.value.length,
        parameterColumns: parameterColumnsRef.value.length
      })
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error processing essential data:', error)
      processingState.value.error =
        error instanceof Error ? error : new Error('Failed to process essential data')
      throw processingState.value.error
    }
  }

  // Process full data pipeline
  function processFullData() {
    if (!allElements.value) return

    try {
      processingState.value.isProcessingFullData = true

      // Step 1: Full filter
      const { filteredElements } = filterElements({
        allElements: allElements.value,
        selectedParent: selectedParentCategories.value,
        selectedChild: selectedChildCategories.value
      })
      filteredElementsRef.value = filteredElements

      // Step 2: Full processing
      const { processedElements, parameterColumns, availableHeaders } =
        processParameters({
          filteredElements: filteredElementsRef.value
        })

      processedElementsRef.value = processedElements
      parameterColumnsRef.value = [
        ...defaultColumns,
        ...parameterColumns.filter(
          (col) => !defaultColumns.find((d) => d.field === col.field)
        )
      ]
      availableHeadersRef.value = availableHeaders

      // Step 3: Transform to table data
      tableDataRef.value = transformToTableData(processedElements)

      debug.log(DebugCategories.DATA, 'Full data pipeline complete', {
        sourceElements: allElements.value.length,
        filteredElements: filteredElements.length,
        processedElements: processedElements.length,
        tableRows: tableDataRef.value.length,
        parameterColumns: parameterColumnsRef.value.length,
        availableHeaders: {
          parent: availableHeaders.parent.length,
          child: availableHeaders.child.length
        }
      })
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error processing full data:', error)
      processingState.value.error =
        error instanceof Error ? error : new Error('Failed to process full data')
    } finally {
      processingState.value.isProcessingFullData = false
    }
  }

  // Process data pipeline progressively
  function processDataPipeline() {
    if (!allElements.value) {
      debug.warn(DebugCategories.DATA, 'No elements available for processing')
      return
    }

    try {
      // Process essential data immediately
      processEssentialData()

      // Queue full processing
      queueMicrotask(() => {
        processFullData()
      })
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error in data pipeline:', error)
      processingState.value.error =
        error instanceof Error ? error : new Error('Failed to process data pipeline')
      throw processingState.value.error
    }
  }

  // Watch for changes in source data
  watch(
    () => allElements.value,
    () => {
      processDataPipeline()
    },
    { immediate: true }
  )

  // Watch for category changes
  watch(
    [selectedParentCategories, selectedChildCategories],
    () => {
      if (!allElements.value) return
      processDataPipeline()
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
      selectedParentCategories.value = parentCategories
      selectedChildCategories.value = childCategories

      // Process essential data first
      await new Promise<void>((resolve) => {
        processEssentialData()
        resolve()
      })

      // Process full data
      await new Promise<void>((resolve) => {
        queueMicrotask(() => {
          processFullData()
          resolve()
        })
      })

      debug.log(DebugCategories.DATA, 'Categories updated', {
        filteredCount: filteredElementsRef.value.length,
        processedCount: processedElementsRef.value.length,
        tableRows: tableDataRef.value.length,
        visibleColumns: parameterColumnsRef.value.filter((col) => col.visible).length,
        parentCategories,
        childCategories
      })
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
        tableRows: tableDataRef.value.length,
        columns: parameterColumnsRef.value.length,
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
      if (!elements?.length) {
        parentElements.value = []
        childElements.value = []
        matchedElements.value = []
        orphanedElements.value = []
        return
      }

      const filterElements = (predicate: (el: ElementData) => boolean) =>
        elements.filter(predicate)

      parentElements.value = filterElements((el) => !el.host)
      childElements.value = filterElements((el) => !!el.host)
      matchedElements.value = filterElements((el) => !!el.details?.length)
      orphanedElements.value = filterElements((el) => !!el.host && !el.details?.length)

      debug.log(DebugCategories.DATA, 'Debug elements updated', {
        parentCount: parentElements.value.length,
        childCount: childElements.value.length,
        matchedCount: matchedElements.value.length,
        orphanedCount: orphanedElements.value.length
      })
    },
    { immediate: true }
  )

  return {
    // Core data
    scheduleData: processedElementsRef,
    tableData: tableDataRef,
    availableHeaders: availableHeadersRef,
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
