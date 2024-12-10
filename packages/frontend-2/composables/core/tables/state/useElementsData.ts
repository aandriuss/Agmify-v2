import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'
import type {
  ElementData,
  ProcessingState,
  TableRow,
  ElementsDataReturn
} from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useBIMElements } from './useBIMElements'
import { useParameterDiscovery } from './useParameterDiscovery'
import { processDataPipeline } from '../utils/dataPipeline'
import { useStore } from '~/composables/core/store'
import { convertViewerTreeToTreeItem } from '~/composables/core/utils/conversion/tree-conversion'
import { processedHeaderToParameter } from '~/composables/core/utils/conversion/header-conversion'
import { createElementData } from '~/composables/core/types/elements'

interface UseElementsDataOptions {
  selectedParentCategories: Ref<string[]>
  selectedChildCategories: Ref<string[]>
}

/**
 * Ensure required element properties
 */
function ensureElementProps(data: unknown): { id: string; type: string } {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid element data')
  }

  const id = (data as { id?: unknown }).id
  const type = (data as { type?: unknown }).type

  if (typeof id !== 'string' || typeof type !== 'string') {
    throw new Error('Invalid element data: missing id or type')
  }

  return { id, type }
}

/**
 * Core elements data composable
 * Handles BIM element data processing and state management
 */
export function useElementsData({
  selectedParentCategories,
  selectedChildCategories
}: UseElementsDataOptions): ElementsDataReturn {
  const store = useStore()
  const {
    allElements,
    rawWorldTree,
    isLoading: bimLoading,
    hasError: bimError,
    stopWorldTreeWatch,
    initializeElements
  } = useBIMElements()

  const { availableParentHeaders, availableChildHeaders, discoverParameters } =
    useParameterDiscovery({
      selectedParentCategories,
      selectedChildCategories
    })

  const processingState = ref<ProcessingState>({
    isProcessingElements: false,
    processedCount: 0,
    totalCount: 0,
    error: undefined
  })

  const scheduleDataRef = ref<ElementData[]>([])
  const tableDataRef = ref<TableRow[]>([])

  // Update data when source data or categories change
  const updateData = async (elements: ElementData[]) => {
    try {
      if (!elements?.length) {
        debug.warn(DebugCategories.DATA, 'No elements available for processing')
        scheduleDataRef.value = []
        tableDataRef.value = []
        return
      }

      debug.startState(DebugCategories.DATA_TRANSFORM, 'Processing data', {
        elementCount: elements.length,
        selectedParent: selectedParentCategories.value,
        selectedChild: selectedChildCategories.value
      })
      processingState.value.isProcessingElements = true

      // First, discover ALL available parameters
      if (rawWorldTree.value) {
        const treeItem = convertViewerTreeToTreeItem(rawWorldTree.value)
        if (treeItem) {
          await discoverParameters(treeItem)

          // Add user parameters
          const userParams = store.userParameters.value || []
          const discoveredParentParams = [
            ...availableParentHeaders.value,
            ...userParams
              .map((param) => ({
                ...param,
                isFetched: true,
                value: param.value || null,
                source: 'User Parameters',
                fetchedGroup: 'User Parameters',
                currentGroup: 'User Parameters'
              }))
              .map(processedHeaderToParameter)
          ]
          const discoveredChildParams = [
            ...availableChildHeaders.value,
            ...userParams
              .map((param) => ({
                ...param,
                isFetched: true,
                value: param.value || null,
                source: 'User Parameters',
                fetchedGroup: 'User Parameters',
                currentGroup: 'User Parameters'
              }))
              .map(processedHeaderToParameter)
          ]

          // Update store with available parameters
          await store.lifecycle.update({
            availableHeaders: {
              parent: discoveredParentParams,
              child: discoveredChildParams
            }
          })
        }
      }

      // Process data
      const result = await processDataPipeline({
        allElements: elements,
        selectedParent: selectedParentCategories.value,
        selectedChild: selectedChildCategories.value
      })

      // Get current columns
      const currentParentColumns = store.parentVisibleColumns.value || []
      const currentChildColumns = store.childVisibleColumns.value || []

      // Update store with processed data
      await store.lifecycle.update({
        scheduleData: result.filteredElements,
        evaluatedData: result.processedElements,
        tableData: result.tableData,
        parentVisibleColumns: currentParentColumns,
        childVisibleColumns: currentChildColumns,
        parentBaseColumns: result.parentColumns,
        childBaseColumns: result.childColumns,
        initialized: true
      })

      // Update local refs
      scheduleDataRef.value = result.filteredElements
      tableDataRef.value = result.tableData

      // Update processing state
      processingState.value.processedCount = result.processedElements.length
      processingState.value.totalCount = elements.length

      debug.completeState(DebugCategories.DATA_TRANSFORM, 'Data processing complete', {
        filteredCount: result.filteredElements.length,
        processedCount: result.processedElements.length,
        isComplete: result.isProcessingComplete
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Error processing data:', err)
      processingState.value.error = err instanceof Error ? err : new Error(String(err))
    } finally {
      processingState.value.isProcessingElements = false
    }
  }

  // Watch for BIM elements changes
  watch(() => allElements.value, updateData, { immediate: true })

  // Add watch for category changes
  watch(
    () => [selectedParentCategories.value, selectedChildCategories.value],
    () => {
      if (allElements.value?.length) {
        updateData(allElements.value)
      }
    }
  )

  // Initialize data
  const initializeData = async (): Promise<void> => {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Initializing data')
      processingState.value.isProcessingElements = true
      await initializeElements()
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Error initializing data:', err)
      processingState.value.error =
        err instanceof Error ? err : new Error('Failed to initialize data')
      throw err
    } finally {
      processingState.value.isProcessingElements = false
    }
  }

  // Category update handler
  const updateCategories = async (
    _parentCategories: string[],
    _childCategories: string[]
  ): Promise<void> => {
    try {
      debug.startState(DebugCategories.CATEGORY_UPDATES, 'Updating categories')
      processingState.value.isProcessingElements = true
      processingState.value.error = undefined

      if (allElements.value?.length) {
        await updateData(allElements.value)
      }
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Error updating categories:', err)
      processingState.value.error =
        err instanceof Error ? err : new Error('Failed to update categories')
      throw err
    } finally {
      processingState.value.isProcessingElements = false
    }
  }

  // Computed properties for elements
  const parentElements = computed(() =>
    tableDataRef.value
      .filter(
        (row): row is TableRow & { details: TableRow[] } =>
          !row.isChild && Array.isArray(row.details)
      )
      .map((row) => {
        const { id, type } = ensureElementProps(row)
        return createElementData({
          ...row,
          id,
          type,
          visible: true,
          details: row.details.map((child) => {
            const { id: childId, type: childType } = ensureElementProps(child)
            return createElementData({
              ...child,
              id: childId,
              type: childType,
              visible: true,
              details: []
            })
          })
        })
      })
  )

  const childElements = computed(() => {
    const children: ElementData[] = []
    tableDataRef.value.forEach((row) => {
      if (Array.isArray(row.details) && row.details.length > 0) {
        children.push(
          ...row.details.map((child) => {
            const { id, type } = ensureElementProps(child)
            return createElementData({
              ...(child as Partial<ElementData>),
              id,
              type,
              visible: true,
              details: []
            })
          })
        )
      }
    })
    return children
  })

  const matchedElements = computed(() =>
    childElements.value.filter((child) => child.host && child.host !== 'Without Host')
  )

  const orphanedElements = computed(() =>
    childElements.value.filter((child) => !child.host || child.host === 'Without Host')
  )

  // Create data state
  const state = computed(() => ({
    rawElements: allElements.value,
    parentElements: parentElements.value,
    childElements: childElements.value,
    matchedElements: matchedElements.value,
    orphanedElements: orphanedElements.value,
    processingState: processingState.value,
    loading: bimLoading.value,
    error: processingState.value.error
  }))

  return {
    scheduleData: scheduleDataRef.value,
    tableData: tableDataRef.value,
    availableCategories: {
      parent: new Set(selectedParentCategories.value),
      child: new Set(selectedChildCategories.value)
    },
    updateCategories,
    initializeData,
    stopWorldTreeWatch,
    isLoading: bimLoading.value || processingState.value.isProcessingElements,
    hasError: bimError.value || !!processingState.value.error,
    state: state.value,
    processingState: processingState.value
  }
}
