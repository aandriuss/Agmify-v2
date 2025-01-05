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

      // Process elements in chunks
      const elements = options.elements.value
      const chunkSize = 100
      const chunks = []
      for (let i = 0; i < elements.length; i += chunkSize) {
        chunks.push(elements.slice(i, i + chunkSize))
      }

      let processedCount = 0
      const totalCount = elements.length

      for (const [index, chunk] of chunks.entries()) {
        // Process chunk
        for (const element of chunk) {
          const category = element.category || 'Uncategorized'
          const mark = element.mark || `Element-${element.id}`

          // Check if element matches category filters
          const isParentCategory =
            options.selectedParentCategories.value.length === 0 ||
            options.selectedParentCategories.value.includes(category)
          const isChildCategory =
            options.selectedChildCategories.value.length === 0 ||
            options.selectedChildCategories.value.includes(category)

          // Skip elements that don't match category filters
          if (
            (element.isChild && !isChildCategory) ||
            (!element.isChild && !isParentCategory)
          ) {
            continue
          }

          // Get only selected parameter values
          const relevantParams = element.isChild
            ? selectedParams.child
            : selectedParams.parent
          const processedParams: Record<string, ParameterValue> = {}

          // Only process selected parameters if element has parameters
          if (hasParameters(element)) {
            for (const param of relevantParams) {
              let paramValue = null
              // Try to find parameter in any group
              for (const [paramKey, value] of Object.entries(element.parameters)) {
                // Check if this parameter matches the selected one (ignoring group)
                const paramName = paramKey.includes('.')
                  ? paramKey.split('.').pop()!
                  : paramKey
                if (paramName === param.name) {
                  paramValue = convertToParameterValue(value)
                  break
                }
              }
              // Store parameter value (null if not found)
              processedParams[param.id] = paramValue
            }
          }

          // Create element with all required fields
          const processedElement: ElementData = {
            // Required BaseTableRow fields
            id: element.id,
            name: element.name || mark,
            field: element.id,
            header: element.name || mark,
            visible: true,
            order: 0,
            removable: true,

            // Required ElementData fields
            type: element.type || 'unknown',
            parameters: processedParams,

            // Optional ElementData fields
            mark,
            category,
            isChild: element.isChild || false,
            host: element.host,
            metadata: element.metadata,
            details: element.details,
            _visible: element._visible,
            _raw: element._raw
          }

          // Store element in appropriate collection
          if (processedElement.isChild) {
            childElementsList.value.push(processedElement)
          } else {
            elementsMap.value.set(mark, processedElement)
          }
        }

        // Update progress
        processedCount += chunk.length
        const progress = Math.round((processedCount / totalCount) * 100)

        debug.log(DebugCategories.DATA_TRANSFORM, 'Chunk processed', {
          chunkIndex: index + 1,
          totalChunks: chunks.length,
          processedCount,
          totalCount,
          progress: `${progress}%`,
          currentParentCount: elementsMap.value.size,
          currentChildCount: childElementsList.value.length
        })

        // Allow other tasks to run between chunks
        await new Promise((resolve) => setTimeout(resolve, 0))
      }

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

  // Watch for parameter changes
  watch(
    () => tableStore.currentTable.value?.selectedParameters,
    async (newParams, oldParams) => {
      if (JSON.stringify(newParams) !== JSON.stringify(oldParams)) {
        debug.log(DebugCategories.PARAMETERS, 'Selected parameters changed', {
          oldParams,
          newParams
        })
        await processElements()
      }
    },
    { deep: true }
  )

  // Watch for element changes
  watch(
    () => options.elements.value,
    async (newElements, oldElements) => {
      if (newElements?.length !== oldElements?.length) {
        debug.log(DebugCategories.DATA_TRANSFORM, 'Elements changed', {
          oldCount: oldElements?.length,
          newCount: newElements?.length
        })
        await processElements()
      }
    }
  )

  // Process elements immediately when we have both elements and parameters
  watch(
    [
      () => options.elements.value,
      () => tableStore.currentTable.value?.selectedParameters
    ],
    async ([elements, params]) => {
      // Skip if already processing
      if (processingState.value.isProcessingElements) {
        debug.warn(DebugCategories.DATA_TRANSFORM, 'Already processing elements')
        return
      }

      // Check if we have both elements and parameters
      const hasElements = elements?.length > 0
      const hasParams =
        params && (Array.isArray(params.parent) || Array.isArray(params.child))

      if (hasElements && hasParams && params) {
        debug.log(DebugCategories.DATA_TRANSFORM, 'Initial data ready', {
          elements: elements.length,
          parameters: {
            parent: Array.isArray(params.parent) ? params.parent.length : 0,
            child: Array.isArray(params.child) ? params.child.length : 0
          }
        })

        // Process elements and update state
        processingState.value.isProcessingElements = true
        try {
          await processElements()
        } finally {
          processingState.value.isProcessingElements = false
        }
      } else {
        debug.log(DebugCategories.DATA_TRANSFORM, 'Waiting for data', {
          hasElements,
          hasParams,
          elements: elements?.length || 0,
          parameters: {
            parent: params && Array.isArray(params.parent) ? params.parent.length : 0,
            child: params && Array.isArray(params.child) ? params.child.length : 0
          }
        })
      }
    },
    { immediate: true }
  )

  // Watch for category changes
  watch(
    [
      () => options.selectedParentCategories.value,
      () => options.selectedChildCategories.value
    ],
    async ([newParent, newChild], [oldParent, oldChild]) => {
      if (
        JSON.stringify(newParent) !== JSON.stringify(oldParent) ||
        JSON.stringify(newChild) !== JSON.stringify(oldChild)
      ) {
        debug.log(DebugCategories.CATEGORY_UPDATES, 'Categories changed', {
          oldParent,
          newParent,
          oldChild,
          newChild
        })
        await processElements()
      }
    },
    { deep: true }
  )

  // Direct reference to store data to avoid redundant transformations
  const scheduleData = computed<ElementData[]>(() => store.scheduleData.value || [])

  // Computed properties for state
  const isLoading = computed(() => processingState.value.isProcessingElements)
  const hasError = computed(() => !!processingState.value.error)

  const state = computed<DataState>(() => ({
    rawElements: scheduleData.value,
    parentElements: scheduleData.value.filter((el) => !el.isChild),
    childElements: scheduleData.value.filter((el) => el.isChild),
    matchedElements: scheduleData.value.filter(
      (el) => el.isChild && el.host && el.host !== 'No Host'
    ),
    orphanedElements: scheduleData.value.filter(
      (el) => el.isChild && (!el.host || el.host === 'No Host')
    ),
    processingState: processingState.value,
    loading: isLoading.value,
    error: processingState.value.error
  }))

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
