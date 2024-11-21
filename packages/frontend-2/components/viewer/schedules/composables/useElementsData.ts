import { ref, computed, watch, type Ref } from 'vue'
import type {
  ElementsDataReturn,
  ElementData,
  ProcessingState,
  TableRow,
  ProcessedHeader,
  AvailableHeaders,
  Parameters,
  ParameterValue
} from '../types'
import { debug, DebugCategories } from '../utils/debug'
import { useBIMElements } from './useBIMElements'
import { filterElements } from './useElementCategories'
import { processParameters } from './useElementParameters'
import { defaultColumns, defaultDetailColumns } from '../config/defaultColumns'
import store from './useScheduleStore'

/**
 * Creates a mutable copy of an array with type safety
 */
function toMutable<T>(arr: readonly T[] | T[]): T[] {
  return Array.isArray(arr) ? [...arr] : []
}

/**
 * Get active parameters from columns
 */
function getActiveParameters(columns: typeof defaultColumns): string[] {
  return columns.map((col) => col.field)
}

/**
 * Transform parameter value based on type
 */
function transformValue(value: unknown): ParameterValue {
  // Handle null/undefined
  if (value === null || value === undefined) return null

  // Handle strings
  if (typeof value === 'string') {
    const trimmed = value.trim()

    // Handle percentages
    if (trimmed.endsWith('%')) {
      const num = parseFloat(trimmed)
      return isNaN(num) ? null : num / 100
    }

    // Handle currency
    if (trimmed.startsWith('$')) {
      const num = parseFloat(trimmed.substring(1))
      return isNaN(num) ? null : num
    }

    // Handle numbers
    const num = parseFloat(trimmed)
    if (!isNaN(num)) return num

    return trimmed
  }

  // Handle objects
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value) || null
    } catch {
      return null
    }
  }

  // Handle numbers and booleans
  if (typeof value === 'number') return isNaN(value) ? null : value
  if (typeof value === 'boolean') return value

  // Default to null for unsupported types
  return null
}

/**
 * Create table row with all active parameters
 */
function createTableRow(element: ElementData, activeParams: string[]): TableRow {
  // Start with basic element data
  const row = {
    id: element.id,
    mark: element.mark,
    category: element.category,
    type: element.type || '',
    parameters: {} as Parameters,
    _visible: element._visible,
    isChild: element.isChild,
    _raw: element._raw
  }

  // Add all active parameters, with null if not in BIM data
  activeParams.forEach((param) => {
    const value = transformValue(element.parameters[param])
    row.parameters[param] = {
      fetchedValue: value,
      currentValue: value,
      previousValue: value,
      userValue: null
    }
  })

  return row
}

type ElementsDataReturnWithTableRows = Omit<ElementsDataReturn, 'tableData'> & {
  tableData: Ref<TableRow[]>
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
}): ElementsDataReturnWithTableRows {
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
  const availableHeadersRef = ref<AvailableHeaders>({
    parent: [] as ProcessedHeader[],
    child: [] as ProcessedHeader[]
  })

  // Initialize with default columns
  store.lifecycle.update({
    currentTableColumns: toMutable(defaultColumns),
    currentDetailColumns: toMutable(defaultDetailColumns)
  })

  // Update filtered elements when source data or categories change
  watch(
    [allElements, selectedParentCategories, selectedChildCategories],
    async ([elements, parentCats, childCats]) => {
      try {
        // Skip if store isn't initialized yet
        if (!store.initialized.value) {
          debug.log(
            DebugCategories.STATE,
            'Skipping data processing - store not initialized',
            {
              storeInitialized: store.initialized.value,
              hasElements: !!elements,
              elementCount: elements?.length || 0
            }
          )
          return
        }

        if (!elements) {
          debug.warn(DebugCategories.DATA, 'No elements available for processing')
          filteredElementsRef.value = []
          return
        }

        // Process elements
        debug.log(DebugCategories.DATA, 'Processing elements', {
          elementCount: elements.length,
          parentCategories: parentCats,
          childCategories: childCats
        })

        // Step 1: Filter elements based on categories
        const { filteredElements } = filterElements({
          allElements: toMutable(elements),
          selectedParent: parentCats,
          selectedChild: childCats
        })

        // Step 2: Get active parameters for each type
        const parentParams = getActiveParameters(defaultColumns)
        const childParams = getActiveParameters(defaultDetailColumns)

        // Step 3: Process parameters separately for parent and child elements
        const parentResult = await processParameters({
          filteredElements: filteredElements.filter((el) => !el.isChild),
          initialColumns: defaultColumns
        })

        const childResult = await processParameters({
          filteredElements: filteredElements.filter((el) => el.isChild),
          initialColumns: defaultDetailColumns
        })

        // Step 4: Combine processed elements
        const processedElements = [
          ...parentResult.processedElements,
          ...childResult.processedElements
        ]

        // Step 5: Create table rows with all active parameters
        const tableRows = processedElements.map((el) =>
          createTableRow(el, el.isChild ? childParams : parentParams)
        )

        // Step 6: Update store
        await store.lifecycle.update({
          selectedParentCategories: parentCats,
          selectedChildCategories: childCats,
          scheduleData: processedElements,
          evaluatedData: processedElements,
          tableData: tableRows,
          currentTableColumns: toMutable(parentResult.parameterColumns),
          currentDetailColumns: toMutable(childResult.parameterColumns),
          availableHeaders: {
            parent: toMutable(parentResult.availableHeaders.parent),
            child: toMutable(childResult.availableHeaders.child)
          }
        })

        // Step 7: Update local refs
        filteredElementsRef.value = processedElements
        scheduleDataRef.value = processedElements
        tableDataRef.value = tableRows
        availableHeadersRef.value = {
          parent: toMutable(parentResult.availableHeaders.parent),
          child: toMutable(childResult.availableHeaders.child)
        }

        debug.log(DebugCategories.DATA, 'Data processing complete', {
          processedCount: processedElements.length,
          tableRowsCount: tableRows.length,
          sampleRow: tableRows[0],
          sampleParameters: tableRows[0]?.parameters,
          activeParameters: {
            parent: parentParams,
            child: childParams
          }
        })
      } catch (error) {
        debug.error(DebugCategories.ERROR, 'Error updating filtered elements:', error)
        processingState.value.error =
          error instanceof Error ? error : new Error(String(error))
      }
    },
    { immediate: false } // Don't run immediately, wait for store initialization
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

      // Step 2: Get active parameters
      const activeParameters = getActiveParameters(defaultColumns)

      // Step 3: Initialize BIM elements with active parameters
      await initializeElements(activeParameters)

      // Step 4: Process initial data
      if (allElements.value) {
        const { filteredElements } = filterElements({
          allElements: toMutable(allElements.value),
          selectedParent: selectedParentCategories.value,
          selectedChild: selectedChildCategories.value
        })

        const parentParams = getActiveParameters(defaultColumns)
        const childParams = getActiveParameters(defaultDetailColumns)

        const parentResult = await processParameters({
          filteredElements: filteredElements.filter((el) => !el.isChild),
          initialColumns: defaultColumns
        })

        const childResult = await processParameters({
          filteredElements: filteredElements.filter((el) => el.isChild),
          initialColumns: defaultDetailColumns
        })

        const processedElements = [
          ...parentResult.processedElements,
          ...childResult.processedElements
        ]

        const tableRows = processedElements.map((el) =>
          createTableRow(el, el.isChild ? childParams : parentParams)
        )

        // Update store with initial data
        await store.lifecycle.update({
          scheduleData: processedElements,
          evaluatedData: processedElements,
          tableData: tableRows,
          currentTableColumns: toMutable(parentResult.parameterColumns),
          currentDetailColumns: toMutable(childResult.parameterColumns),
          availableHeaders: {
            parent: toMutable(parentResult.availableHeaders.parent),
            child: toMutable(childResult.availableHeaders.child)
          }
        })

        // Update local refs
        filteredElementsRef.value = processedElements
        scheduleDataRef.value = processedElements
        tableDataRef.value = tableRows
        availableHeadersRef.value = {
          parent: toMutable(parentResult.availableHeaders.parent),
          child: toMutable(childResult.availableHeaders.child)
        }
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

      // Step 1: Update local categories
      selectedParentCategories.value = toMutable(parentCategories)
      selectedChildCategories.value = toMutable(childCategories)

      // Step 2: Filter elements with new categories
      const { filteredElements } = filterElements({
        allElements: toMutable(allElements.value),
        selectedParent: parentCategories,
        selectedChild: childCategories
      })

      // Step 3: Get active parameters for each type
      const parentParams = getActiveParameters(defaultColumns)
      const childParams = getActiveParameters(defaultDetailColumns)

      // Step 4: Process parameters
      const parentResult = await processParameters({
        filteredElements: filteredElements.filter((el) => !el.isChild),
        initialColumns: defaultColumns
      })

      const childResult = await processParameters({
        filteredElements: filteredElements.filter((el) => el.isChild),
        initialColumns: defaultDetailColumns
      })

      // Step 5: Combine processed elements
      const processedElements = [
        ...parentResult.processedElements,
        ...childResult.processedElements
      ]

      // Step 6: Create table rows with all active parameters
      const tableRows = processedElements.map((el) =>
        createTableRow(el, el.isChild ? childParams : parentParams)
      )

      // Step 7: Update store
      await store.lifecycle.update({
        selectedParentCategories: parentCategories,
        selectedChildCategories: childCategories,
        scheduleData: processedElements,
        evaluatedData: processedElements,
        tableData: tableRows,
        currentTableColumns: toMutable(parentResult.parameterColumns),
        currentDetailColumns: toMutable(childResult.parameterColumns),
        availableHeaders: {
          parent: toMutable(parentResult.availableHeaders.parent),
          child: toMutable(childResult.availableHeaders.child)
        }
      })

      // Step 8: Update local refs
      filteredElementsRef.value = processedElements
      scheduleDataRef.value = processedElements
      tableDataRef.value = tableRows
      availableHeadersRef.value = {
        parent: toMutable(parentResult.availableHeaders.parent),
        child: toMutable(childResult.availableHeaders.child)
      }

      debug.log(DebugCategories.DATA, 'Categories updated', {
        processedCount: processedElements.length,
        tableRowsCount: tableRows.length,
        sampleRow: tableRows[0],
        sampleParameters: tableRows[0]?.parameters,
        activeParameters: {
          parent: parentParams,
          child: childParams
        }
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

  // Return object
  return {
    scheduleData: scheduleDataRef,
    tableData: tableDataRef,
    availableHeaders: availableHeadersRef,
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
