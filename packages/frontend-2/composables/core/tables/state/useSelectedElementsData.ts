import { ref, computed, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type {
  ElementData,
  ViewerTableRow,
  TableRow,
  Store
} from '~/composables/core/types'
import type { ParameterValue } from '~/composables/core/types/parameters'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from '~/composables/core/store'
import { useTableStore } from '~/composables/core/tables/store/store'
import { convertToParameterValue } from '~/composables/core/parameters/parameter-processing'
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

// Type guard for element parameters
function hasParameters(
  element: ElementData
): element is ElementData & { parameters: Record<string, ParameterValue> } {
  return element.parameters !== undefined && typeof element.parameters === 'object'
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

      // Get selected parameters from table store
      const selectedParams = tableStore.currentTable.value?.selectedParameters || {
        parent: [],
        child: []
      }

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
        const processedElements = await Promise.all(
          chunk.map(async (element) => {
            try {
              // Ensure required fields
              const id = element.id
              const mark = element.mark || `Element-${id}`
              const category = element.category || 'Uncategorized'

              // Always process all elements, category filtering happens in state computation

              // Get only selected parameter values
              const relevantParams = element.isChild
                ? selectedParams.child
                : selectedParams.parent
              const processedParams: Record<string, ParameterValue> = {}

              // Only process selected parameters if element has parameters
              if (hasParameters(element)) {
                // Create parameter map for faster lookup
                const paramMap = new Map(
                  Object.entries(element.parameters).map(([key, value]) => [
                    key.includes('.') ? key.split('.').pop()! : key,
                    value
                  ])
                )

                // Process parameters using map lookup
                for (const param of relevantParams) {
                  const paramValue = paramMap.get(param.name)
                  processedParams[param.id] = paramValue
                    ? await convertToParameterValue(paramValue)
                    : null
                }
              }

              // Create element with all required fields
              const processedElement: ElementData = {
                // Required BaseTableRow fields
                id,
                name: element.name || mark,
                field: id,
                header: element.name || mark,
                visible: true,
                order: 0,
                removable: true,

                // Required ElementData fields
                type: element.type || 'unknown',
                parameters: processedParams,

                // Optional ElementData fields
                mark, // Guaranteed to be string
                category,
                isChild: element.isChild || false,
                host: element.host,
                metadata: element.metadata,
                details: element.details,
                _visible: element._visible,
                _raw: element._raw
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
        )

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
          columns: tableStore.currentTable.value?.parentColumns?.length || 0,
          parameters: tableStore.currentTable.value?.selectedParameters || {
            parent: [],
            child: []
          }
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
      () => tableStore.currentTable.value?.selectedParameters,
      () => options.selectedParentCategories.value,
      () => options.selectedChildCategories.value
    ],
    async ([elements, params, parentCategories, childCategories], oldValues) => {
      // Skip if already processing
      if (processingState.value.isProcessingElements) {
        debug.warn(DebugCategories.DATA_TRANSFORM, 'Already processing elements')
        return
      }

      // Check if we have both elements and parameters
      const hasElements = elements?.length > 0
      const hasParams =
        params && (Array.isArray(params.parent) || Array.isArray(params.child))

      // Check if data has actually changed
      const [oldElements, oldParams, oldParentCats, oldChildCats] = oldValues || []
      const hasChanged =
        elements?.length !== oldElements?.length ||
        JSON.stringify(params) !== JSON.stringify(oldParams) ||
        JSON.stringify(parentCategories) !== JSON.stringify(oldParentCats) ||
        JSON.stringify(childCategories) !== JSON.stringify(oldChildCats)

      if (hasElements && hasParams && params && hasChanged) {
        debug.log(DebugCategories.DATA_TRANSFORM, 'Data changed', {
          elements: {
            count: elements.length,
            changed: elements?.length !== oldElements?.length
          },
          parameters: {
            parent: Array.isArray(params.parent) ? params.parent.length : 0,
            child: Array.isArray(params.child) ? params.child.length : 0,
            changed: JSON.stringify(params) !== JSON.stringify(oldParams)
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
            parameters: {
              parent: params.parent.length,
              child: params.child.length
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
          hasParams,
          hasChanged,
          elements: elements?.length || 0,
          parameters: {
            parent: params && Array.isArray(params.parent) ? params.parent.length : 0,
            child: params && Array.isArray(params.child) ? params.child.length : 0
          }
        })
      }
    },
    { immediate: true, deep: true }
  )

  // Direct reference to store data to avoid redundant transformations
  const scheduleData = computed<ElementData[]>(() => store.scheduleData.value || [])

  // Computed properties for state
  const isLoading = computed(() => processingState.value.isProcessingElements)
  const hasError = computed(() => !!processingState.value.error)

  const state = computed<DataState>(() => {
    const hasParentCategories = options.selectedParentCategories.value.length > 0
    const hasChildCategories = options.selectedChildCategories.value.length > 0

    debug.log(DebugCategories.DATA_TRANSFORM, 'Starting element filtering', {
      totalElements: scheduleData.value.length,
      categories: {
        parent: {
          selected: hasParentCategories,
          categories: options.selectedParentCategories.value
        },
        child: {
          selected: hasChildCategories,
          categories: options.selectedChildCategories.value
        }
      }
    })

    // First filter by categories
    const filteredElements = scheduleData.value.filter((el) => {
      const category = el.category || 'Uncategorized'
      let include = false

      // If no categories selected, include all elements
      if (!hasParentCategories && !hasChildCategories) {
        include = true
      }
      // For parent elements (including Uncategorized)
      else if (el.metadata?.isParent) {
        // If no parent categories selected, include all parent elements
        if (!hasParentCategories) {
          include = true
        }
        // Otherwise check if category matches selected parent categories
        else {
          include = options.selectedParentCategories.value.includes(category)
        }
      }
      // For child elements
      else if (el.isChild) {
        // If no child categories selected, include all child elements
        if (!hasChildCategories) {
          include = true
        }
        // Otherwise check if category matches selected child categories
        else {
          include = options.selectedChildCategories.value.includes(category)
        }
      }

      debug.log(DebugCategories.DATA_TRANSFORM, 'Element filtering', {
        id: el.id,
        category,
        isChild: el.isChild,
        included: include,
        reason: include
          ? el.isChild
            ? hasChildCategories
              ? 'Matched child category'
              : 'All child categories included'
            : hasParentCategories
            ? 'Matched parent category'
            : 'All parent categories included'
          : 'Category not selected'
      })

      return include
    })

    debug.log(DebugCategories.DATA_TRANSFORM, 'Element filtering complete', {
      totalElements: scheduleData.value.length,
      filteredElements: filteredElements.length,
      categories: {
        parent: {
          selected: hasParentCategories,
          categories: options.selectedParentCategories.value,
          matchedElements: filteredElements.filter((el) => el.metadata?.isParent).length
        },
        child: {
          selected: hasChildCategories,
          categories: options.selectedChildCategories.value,
          matchedElements: filteredElements.filter((el) => el.isChild).length
        }
      }
    })

    // Then split into parent/child elements using metadata
    const parentElements = filteredElements.filter((el) => el.metadata?.isParent)
    const childElements = filteredElements.filter((el) => el.isChild)

    return {
      rawElements: filteredElements,
      parentElements,
      childElements,
      matchedElements: childElements.filter((el) => el.host && el.host !== 'No Host'),
      orphanedElements: childElements.filter((el) => !el.host || el.host === 'No Host'),
      processingState: processingState.value,
      loading: isLoading.value,
      error: processingState.value.error
    }
  })

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
