import { ref, computed, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type {
  ElementData,
  ViewerTableRow,
  TableRow,
  Store
} from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { getMostSpecificCategory } from '~/composables/core/config/categoryMapping'
import { useStore } from '~/composables/core/store'
import { useTableStore } from '~/composables/core/tables/store/store'

interface ProcessingState {
  isProcessingElements: boolean
  processedCount: number
  totalCount: number
  error?: Error
  isProcessingFullData: boolean
}

interface DataState {
  rawElements: ElementData[]
  parentElements: ElementData[]
  childElements: ElementData[]
  matchedElements: ElementData[]
  orphanedElements: ElementData[]
  processingState: ProcessingState
  loading: boolean
  error?: Error
}

interface UseSelectedElementsDataOptions {
  elements: Ref<ElementData[]>
  selectedParentCategories: Ref<string[]>
  selectedChildCategories: Ref<string[]>
}

interface UseSelectedElementsDataReturn {
  scheduleData: ComputedRef<ElementData[]>
  tableData: Ref<ViewerTableRow[]>
  elementsMap: Ref<Map<string, ElementData>>
  childElementsList: Ref<ElementData[]>
  isLoading: ComputedRef<boolean>
  hasError: ComputedRef<boolean>
  state: ComputedRef<DataState>
  processingState: Ref<ProcessingState>
  processElements: (forceProcess?: boolean) => Promise<void>
}

export function useSelectedElementsData(
  options: UseSelectedElementsDataOptions
): UseSelectedElementsDataReturn {
  const store = useStore() as Store & {
    setScheduleData: (data: ElementData[]) => void
    setEvaluatedData: (data: ElementData[]) => void
    setTableData: (data: TableRow[]) => void
  }
  const tableStore = useTableStore()

  const elementsMap = ref<Map<string, ElementData>>(new Map())
  const childElementsList = ref<ElementData[]>([])
  const tableData = ref<ViewerTableRow[]>([])

  const processingState = ref<ProcessingState>({
    isProcessingElements: false,
    processedCount: 0,
    totalCount: 0,
    error: undefined,
    isProcessingFullData: false
  })

  /**
   * Process elements and create schedule data structure
   */
  async function processElements() {
    if (!options.elements.value?.length) {
      debug.warn(DebugCategories.DATA, 'No elements available')
      return
    }

    // Prevent processing while already processing
    if (processingState.value.isProcessingElements) {
      debug.warn(DebugCategories.DATA, 'Already processing elements')
      return
    }

    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Processing elements')
      processingState.value.isProcessingElements = true
      processingState.value.processedCount = 0
      processingState.value.totalCount = 0
      processingState.value.error = undefined

      // Clear existing data
      elementsMap.value.clear()
      childElementsList.value = []

      // Get columns from table store
      const currentTable = tableStore.computed.currentTable.value
      const parentColumns = currentTable?.parentColumns || []
      const childColumns = currentTable?.childColumns || []

      // Process elements in parallel chunks
      const elements = options.elements.value
      const chunkSize = 250 // Increased chunk size for better performance
      const totalCount = elements.length
      let processedCount = 0

      // Pre-allocate arrays for better memory usage
      const processedParents: ElementData[] = []
      const processedChildren: ElementData[] = []

      // Process elements in chunks
      for (let i = 0; i < elements.length; i += chunkSize) {
        const chunk = elements.slice(i, Math.min(i + chunkSize, elements.length))
        const chunkIndex = Math.floor(i / chunkSize)

        // Process chunk elements in parallel with type safety
        const processedElements = chunk.map((element) => {
          try {
            // Ensure required fields
            const id = element.id
            const mark = element.mark || `Element-${id}`
            const category = element.category || 'Uncategorized'

            // Create base element fields
            const baseFields = {
              id,
              name: element.name || mark,
              field: id,
              header: element.name || mark,
              visible: true,
              order: 0,
              removable: true,
              type: element.type || 'unknown',
              mark, // Guaranteed to be string
              category,
              isChild: element.isChild || false,
              host: element.host,
              metadata: element.metadata,
              details: element.details,
              _visible: element._visible,
              _raw: element._raw
            }

            // Create element with all required fields - just pass through the raw parameters
            const processedElement: ElementData = {
              ...baseFields,
              parameters: element.parameters || {},
              metadata: element.metadata
            }

            return processedElement
          } catch (err) {
            debug.error(DebugCategories.ERROR, 'Error processing element:', {
              element,
              error: err
            })
            return null
          }
        })

        // Filter out null elements and sort into parents/children using metadata
        for (const element of processedElements) {
          if (element) {
            if (element.metadata?.isParent) {
              processedParents.push(element)
            } else if (element.isChild) {
              processedChildren.push(element)
            } else {
              debug.warn(
                DebugCategories.DATA_TRANSFORM,
                'Element has no parent/child status',
                {
                  id: element.id,
                  category: element.category,
                  metadata: element.metadata
                }
              )
            }
          }
        }

        // Update progress
        processedCount += chunk.length
        const progress = Math.round((processedCount / totalCount) * 100)

        debug.log(DebugCategories.DATA_TRANSFORM, 'Chunk processed', {
          chunkIndex: chunkIndex + 1,
          totalChunks: Math.ceil(elements.length / chunkSize),
          processedCount,
          totalCount,
          progress: `${progress}%`,
          currentParentCount: processedParents.length,
          currentChildCount: processedChildren.length
        })

        // Allow other tasks to run between chunks
        await new Promise((resolve) => setTimeout(resolve, 0))
      }

      // Update collections with type safety
      const validParents = processedParents.filter(
        (parent): parent is ElementData & { mark: string } =>
          typeof parent.mark === 'string'
      )
      elementsMap.value = new Map(validParents.map((parent) => [parent.mark, parent]))
      childElementsList.value = processedChildren

      // Create final schedule data structure
      const scheduleData = Array.from(elementsMap.value.values()).map((parent) => ({
        ...parent,
        details: childElementsList.value
          .filter((child) => child.host === parent.mark)
          .map((child) => ({
            ...child,
            host: parent.mark
          }))
      }))

      // Add unattached children as top-level elements
      const unattachedChildren = childElementsList.value
        .filter(
          (child) =>
            !child.host || !Array.from(elementsMap.value.keys()).includes(child.host)
        )
        .map((child) => ({
          ...child,
          host: 'No Host',
          details: []
        }))

      // Convert to ViewerTableRow and update store
      const viewerData = [...scheduleData, ...unattachedChildren].map((element) => ({
        ...element,
        parameters: element.parameters || {} // Ensure parameters is present
      }))

      // Update local and store data with proper typing
      const typedViewerData = viewerData as ViewerTableRow[]
      tableData.value = typedViewerData

      // Update store data using individual methods
      await Promise.all([
        store.setScheduleData(typedViewerData),
        store.setTableData(typedViewerData),
        store.setEvaluatedData(typedViewerData)
      ])

      debug.log(DebugCategories.DATA_TRANSFORM, 'Elements processed', {
        totalElements: elements.length,
        matchingElements: elementsMap.value.size + childElementsList.value.length,
        parentElements: elementsMap.value.size,
        childElements: childElementsList.value.length,
        unattachedChildren: unattachedChildren.length,
        processingTime: `${Date.now() - performance.now()}ms`,
        tableData: {
          rows: typedViewerData.length,
          parentColumns: parentColumns.length,
          childColumns: childColumns.length
        }
      })

      debug.completeState(DebugCategories.INITIALIZATION, 'Elements processed')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Error processing elements:', err)
      processingState.value.error =
        err instanceof Error ? err : new Error('Failed to process elements')
      throw err
    } finally {
      processingState.value.isProcessingElements = false
    }
  }

  // Single watcher for all data changes
  watch(
    [
      () => options.elements.value,
      () => tableStore.computed.currentTable.value?.parentColumns,
      () => tableStore.computed.currentTable.value?.childColumns,
      () => options.selectedParentCategories.value,
      () => options.selectedChildCategories.value
    ],
    async (
      [elements, parentCols, childCols, parentCategories, childCategories],
      oldValues
    ) => {
      // Skip if already processing
      if (processingState.value.isProcessingElements) {
        debug.warn(DebugCategories.DATA_TRANSFORM, 'Already processing elements')
        return
      }

      // Check if we have both elements and columns
      const hasElements = elements?.length > 0
      const hasColumns = (parentCols?.length ?? 0) > 0 || (childCols?.length ?? 0) > 0

      // Check if data has actually changed
      const [oldElements, oldParentCols, oldChildCols, oldParentCats, oldChildCats] =
        oldValues || []
      const hasChanged =
        elements?.length !== oldElements?.length ||
        JSON.stringify(parentCols) !== JSON.stringify(oldParentCols) ||
        JSON.stringify(childCols) !== JSON.stringify(oldChildCols) ||
        JSON.stringify(parentCategories) !== JSON.stringify(oldParentCats) ||
        JSON.stringify(childCategories) !== JSON.stringify(oldChildCats)

      if (hasElements && hasColumns && hasChanged) {
        debug.log(DebugCategories.DATA_TRANSFORM, 'Data changed', {
          elements: {
            count: elements.length,
            changed: elements?.length !== oldElements?.length
          },
          columns: {
            parent: parentCols?.length ?? 0,
            child: childCols?.length ?? 0,
            changed:
              JSON.stringify(parentCols) !== JSON.stringify(oldParentCols) ||
              JSON.stringify(childCols) !== JSON.stringify(oldChildCols)
          },
          categories: {
            parent: parentCategories.length,
            child: childCategories.length,
            changed:
              JSON.stringify(parentCategories) !== JSON.stringify(oldParentCats) ||
              JSON.stringify(childCategories) !== JSON.stringify(oldChildCats)
          }
        })

        // Wait for next tick to ensure all data is ready
        await new Promise((resolve) => setTimeout(resolve, 0))

        // Process elements and update state
        processingState.value.isProcessingElements = true
        try {
          await processElements()

          // Log processed data
          debug.log(DebugCategories.DATA_TRANSFORM, 'Data processed', {
            elements: tableData.value.length,
            columns: {
              parent: parentCols?.length ?? 0,
              child: childCols?.length ?? 0
            },
            state: {
              parentElements: state.value?.parentElements.length || 0,
              childElements: state.value?.childElements.length || 0
            }
          })
        } finally {
          processingState.value.isProcessingElements = false
        }
      } else {
        debug.log(DebugCategories.DATA_TRANSFORM, 'Waiting for data', {
          hasElements,
          hasColumns,
          hasChanged,
          elements: elements?.length || 0,
          columns: {
            parent: parentCols?.length ?? 0,
            child: childCols?.length ?? 0
          }
        })
      }
    },
    { immediate: true, deep: true }
  )

  // Direct reference to store data to avoid redundant transformations
  const scheduleData = computed<ElementData[]>(() => store.scheduleData.value || [])

  // State refs to avoid computed property churn
  const stateRef = ref<DataState>({
    rawElements: [],
    parentElements: [],
    childElements: [],
    matchedElements: [],
    orphanedElements: [],
    processingState: processingState.value,
    loading: true,
    error: undefined
  })

  // Computed properties for state
  const isLoading = computed(() => processingState.value.isProcessingElements)
  const hasError = computed(() => !!processingState.value.error)

  // Function to filter elements - only called when necessary
  function filterElements() {
    const hasParentCategories = options.selectedParentCategories.value.length > 0
    const hasChildCategories = options.selectedChildCategories.value.length > 0
    const elements = scheduleData.value

    debug.log(DebugCategories.DATA_TRANSFORM, 'Starting element filtering', {
      totalElements: elements.length,
      categories: {
        parent: hasParentCategories ? options.selectedParentCategories.value : [],
        child: hasChildCategories ? options.selectedChildCategories.value : []
      }
    })

    // Filter elements by category
    const filteredElements = elements.filter((el) => {
      const originalCategory = el.category || 'Uncategorized'
      const mappedCategory = getMostSpecificCategory(originalCategory)

      if (!hasParentCategories && !hasChildCategories) return true
      if (el.metadata?.isParent) {
        return (
          !hasParentCategories ||
          options.selectedParentCategories.value.includes(mappedCategory)
        )
      }
      if (el.isChild) {
        return (
          !hasChildCategories ||
          options.selectedChildCategories.value.includes(mappedCategory)
        )
      }
      return false
    })

    // Split elements
    const parentElements = filteredElements.filter((el) => el.metadata?.isParent)
    const childElements = filteredElements.filter((el) => el.isChild)
    const matchedChildren = childElements.filter(
      (el) => el.host && el.host !== 'No Host'
    )
    const orphanedChildren = childElements.filter(
      (el) => !el.host || el.host === 'No Host'
    )

    // Update state
    stateRef.value = {
      rawElements: filteredElements,
      parentElements,
      childElements,
      matchedElements: matchedChildren,
      orphanedElements: orphanedChildren,
      processingState: processingState.value,
      loading: isLoading.value,
      error: processingState.value.error
    }

    debug.log(DebugCategories.DATA_TRANSFORM, 'Element filtering complete', {
      totalElements: elements.length,
      filteredElements: filteredElements.length,
      parents: parentElements.length,
      children: childElements.length,
      matched: matchedChildren.length,
      orphaned: orphanedChildren.length
    })
  }

  // Watch for changes that should trigger filtering
  watch(
    [
      scheduleData,
      () => options.selectedParentCategories.value,
      () => options.selectedChildCategories.value
    ],
    () => {
      if (!processingState.value.isProcessingElements) {
        filterElements()
      }
    },
    { immediate: true }
  )

  // Expose state as computed to maintain reactivity
  const state = computed<DataState>(() => stateRef.value)

  return {
    scheduleData,
    tableData,
    elementsMap,
    childElementsList,
    isLoading,
    hasError,
    state,
    processingState,
    processElements
  }
}
