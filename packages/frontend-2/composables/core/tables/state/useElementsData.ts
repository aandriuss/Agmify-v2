import { ref, computed, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type {
  ElementData,
  ProcessingState,
  TableRow,
  DataState,
  SelectedParameter,
  BimValueType
} from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { createAvailableBimParameter } from '~/composables/core/types/parameters/parameter-states'
import { useStore } from '~/composables/core/store'
import { useTableStore } from '~/composables/core/tables/store/store'
import { useParameterStore } from '~/composables/core/parameters/store'
import { useBIMElements } from './useBIMElements'
import { useTableFlow } from '~/composables/core/tables/state/useTableFlow'
import { defaultTableConfig } from '~/composables/core/tables/config/defaults'
import { useInjectedViewerState } from '~~/lib/viewer/composables/setup'
import { isWorldTreeRoot } from '~/composables/core/types/viewer/viewer-types'

interface AppError extends Error {
  code?: string
  details?: unknown
}

// Helper function to safely log errors
function logError(category: DebugCategories, message: string, err: unknown): AppError {
  let error: AppError
  if (err instanceof Error) {
    error = err as AppError
    error.code = error.code || 'INTERNAL_ERROR'
  } else if (typeof err === 'string') {
    error = Object.assign(new Error(err), { code: 'INTERNAL_ERROR' })
  } else {
    error = Object.assign(new Error('An unknown error occurred'), {
      code: 'UNKNOWN_ERROR',
      details: err
    })
  }

  debug.error(category, message, {
    message: error.message,
    code: error.code,
    details: error.details,
    stack: error.stack
  })

  return error
}

interface UseElementsDataOptions {
  selectedParentCategories: Ref<string[]>
  selectedChildCategories: Ref<string[]>
}

interface UseElementsDataReturn {
  scheduleData: ComputedRef<ElementData[]>
  tableData: Ref<TableRow[]>
  availableCategories: {
    parent: Set<string>
    child: Set<string>
  }
  updateCategories: (
    parentCategories: string[],
    childCategories: string[]
  ) => Promise<void>
  initializeData: () => Promise<void>
  elementsMap: Ref<Map<string, ElementData>>
  childElementsList: Ref<ElementData[]>
  isLoading: ComputedRef<boolean>
  hasError: ComputedRef<boolean>
  state: ComputedRef<DataState>
  processingState: Ref<ProcessingState>
  allElements: ComputedRef<ElementData[]>
}

export function useElementsData(
  options: UseElementsDataOptions
): UseElementsDataReturn {
  const store = useStore()
  const tableStore = useTableStore()
  const parameterStore = useParameterStore()
  const {
    viewer: {
      metadata: { worldTree }
    }
  } = useInjectedViewerState()
  const bimElements = useBIMElements({
    childCategories: options.selectedChildCategories.value
  })
  const elementsMap = ref<Map<string, ElementData>>(new Map())
  const childElementsList = ref<ElementData[]>([])
  const tableData = ref<TableRow[]>([])

  const processingState = ref<ProcessingState>({
    isProcessingElements: false,
    processedCount: 0,
    totalCount: 0,
    error: undefined,
    isProcessingFullData: false
  })

  // Initialize table flow using default config
  const {
    initialize: initializeTable,
    isInitialized: _isInitialized,
    error: _tableError
  } = useTableFlow({
    currentTable: computed(() => tableStore.currentTable.value),
    defaultConfig: {
      ...defaultTableConfig,
      id: `default-table-${Date.now()}` // Ensure unique id for new table
    }
  })

  /**
   * Extract and process parameters from elements
   */
  async function extractParameters() {
    if (!bimElements.allElements.value?.length) {
      debug.warn(DebugCategories.DATA, 'No BIM elements available')
      return
    }

    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Processing parameters')
      processingState.value.isProcessingElements = true

      // Get all elements and ensure they have a parameters object
      const elements = bimElements.allElements.value.map((el) => ({
        ...el,
        parameters: el.parameters || {}
      }))

      if (!elements.length) {
        debug.warn(DebugCategories.DATA, 'No elements found')
        return
      }

      // Process parameters through parameter store
      await parameterStore.processParameters(elements)

      // Get selected parameters from table store
      const currentTable = tableStore.currentTable.value
      if (currentTable?.selectedParameters) {
        const { parent: parentParams, child: childParams } =
          currentTable.selectedParameters

        // Ensure all elements have entries for selected parameters
        elements.forEach((el) => {
          if (!el.parameters) el.parameters = {}

          // Add parent parameters
          parentParams.forEach((param: SelectedParameter) => {
            if (!el.parameters[param.id]) {
              // Create parameter using utility function
              const availableParam = createAvailableBimParameter(
                {
                  id: param.id,
                  name: param.name,
                  value: null,
                  sourceGroup: param.group,
                  metadata: param.metadata || {}
                },
                param.type as BimValueType,
                null
              )
              el.parameters[param.id] = availableParam.value
            }
          })

          // Add child parameters
          childParams.forEach((param: SelectedParameter) => {
            if (!el.parameters[param.id]) {
              // Create parameter using utility function
              const availableParam = createAvailableBimParameter(
                {
                  id: param.id,
                  name: param.name,
                  value: null,
                  sourceGroup: param.group,
                  metadata: param.metadata || {}
                },
                param.type as BimValueType,
                null
              )
              el.parameters[param.id] = availableParam.value
            }
          })
        })
      }

      // Verify parameters were processed
      const paramCounts = {
        parentRaw: parameterStore.parentRawParameters.value?.length || 0,
        childRaw: parameterStore.childRawParameters.value?.length || 0,
        parentBim: parameterStore.parentAvailableBimParameters.value?.length || 0,
        childBim: parameterStore.childAvailableBimParameters.value?.length || 0
      }

      debug.log(DebugCategories.INITIALIZATION, 'Parameters processed', paramCounts)

      if (paramCounts.parentBim === 0 && paramCounts.childBim === 0) {
        debug.warn(DebugCategories.DATA, 'No parameters available after processing')
        return
      }

      // Initialize table with processed parameters
      debug.startState(DebugCategories.INITIALIZATION, 'Initializing table')
      await initializeTable()

      const selectedCounts = {
        parent: tableStore.currentTable.value?.selectedParameters?.parent?.length || 0,
        child: tableStore.currentTable.value?.selectedParameters?.child?.length || 0
      }

      debug.log(DebugCategories.INITIALIZATION, 'Table initialized with parameters', {
        selectedParameters: selectedCounts,
        availableParameters: paramCounts
      })

      debug.completeState(
        DebugCategories.INITIALIZATION,
        'Parameter processing complete'
      )
    } catch (err: unknown) {
      const error = logError(DebugCategories.ERROR, 'Error extracting parameters:', err)
      processingState.value.error = error
      throw error
    } finally {
      processingState.value.isProcessingElements = false
    }
  }

  // Debounce helper with proper types
  function debounce<Args extends unknown[], R>(
    fn: (...args: Args) => Promise<R>,
    wait: number
  ): (...args: Args) => Promise<R> {
    let timeout: ReturnType<typeof setTimeout> | undefined
    let pendingPromise: Promise<R> | undefined

    return (...args: Args): Promise<R> => {
      if (pendingPromise) return pendingPromise

      pendingPromise = new Promise<R>((resolve, reject) => {
        if (timeout) clearTimeout(timeout)

        timeout = setTimeout(async () => {
          timeout = undefined
          try {
            const result = await fn(...args)
            pendingPromise = undefined
            resolve(result)
          } catch (err) {
            pendingPromise = undefined
            reject(err)
          }
        }, wait)
      })

      return pendingPromise
    }
  }

  // Debounced category update handler with proper error handling
  const handleCategoryUpdate = debounce<[string[], string[], string[], string[]], void>(
    async (_newParent, _newChild, _oldParent, _oldChild) => {
      // Skip if already processing
      if (processingState.value.isProcessingElements) {
        debug.warn(DebugCategories.CATEGORY_UPDATES, 'Already processing elements')
        return
      }

      try {
        debug.startState(DebugCategories.CATEGORY_UPDATES, 'Processing category change')
        processingState.value.isProcessingElements = true

        // Update BIM elements with new child categories
        await bimElements.initializeElements(
          isWorldTreeRoot(worldTree.value) ? worldTree.value : null
        )

        // Extract parameters with new categories
        await extractParameters()

        debug.completeState(
          DebugCategories.CATEGORY_UPDATES,
          'Category change processed'
        )
      } catch (err: unknown) {
        const processedError = logError(
          DebugCategories.ERROR,
          'Error processing category change:',
          err
        )
        processingState.value.error = processedError
        throw processedError
      } finally {
        processingState.value.isProcessingElements = false
      }
    },
    300
  ) // 300ms debounce

  // Watch category changes with debouncing
  watch(
    [
      () => options.selectedParentCategories.value,
      () => options.selectedChildCategories.value
    ],
    async ([newParent, newChild], [oldParent, oldChild]) => {
      // Only update if categories actually changed
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

        await handleCategoryUpdate(newParent, newChild, oldParent, oldChild)
      }
    },
    { deep: true }
  )

  // Watch for BIM elements changes
  watch(bimElements.allElements, async (newElements, oldElements) => {
    debug.log(DebugCategories.DATA_TRANSFORM, 'BIM elements changed', {
      newCount: newElements?.length,
      oldCount: oldElements?.length,
      processing: processingState.value.isProcessingElements,
      categories: {
        parent: options.selectedParentCategories.value,
        child: options.selectedChildCategories.value
      }
    })

    // Skip initial watch trigger to avoid race conditions
    if (oldElements === undefined) {
      debug.log(DebugCategories.DATA_TRANSFORM, 'Skipping initial watch trigger')
      return
    }

    // Only process if elements changed, we're not already processing, and this isn't the initial load
    if (
      !processingState.value.isProcessingElements &&
      newElements?.length &&
      oldElements?.length
    ) {
      try {
        processingState.value.isProcessingElements = true

        // Update element metadata with parent/child info
        const updatedElements = newElements.map((element) => {
          const category = element.category || 'Uncategorized'
          const isParent = options.selectedParentCategories.value.includes(category)
          const isChild = options.selectedChildCategories.value.includes(category)

          debug.log(DebugCategories.DATA_TRANSFORM, 'Processing element', {
            id: element.id,
            category,
            isParent,
            isChild,
            parameterCount: Object.keys(element.parameters || {}).length
          })

          return {
            ...element,
            isChild,
            metadata: {
              ...element.metadata,
              isParent,
              category
            }
          }
        })

        // Group elements by selected categories
        const parentElements = updatedElements.filter((el) => el.metadata?.isParent)
        const childElements = updatedElements.filter((el) => el.isChild)

        debug.log(DebugCategories.DATA_TRANSFORM, 'Elements categorized', {
          total: updatedElements.length,
          parents: {
            count: parentElements.length,
            categories: Array.from(new Set(parentElements.map((el) => el.category)))
          },
          children: {
            count: childElements.length,
            categories: Array.from(new Set(childElements.map((el) => el.category)))
          }
        })

        // Update store with processed elements
        await store.lifecycle.update({
          scheduleData: updatedElements,
          tableData: updatedElements,
          evaluatedData: updatedElements
        })

        debug.log(DebugCategories.DATA_TRANSFORM, 'Store updated with elements', {
          total: updatedElements.length,
          parents: updatedElements.filter((el) => el.metadata?.isParent).length,
          children: updatedElements.filter((el) => el.isChild).length,
          parameters: updatedElements.reduce(
            (acc, el) => acc + Object.keys(el.parameters || {}).length,
            0
          )
        })

        // Transform elements into table rows with all parameters
        const transformedElements = updatedElements.map((el) => {
          const parameters = { ...el.parameters }

          // Ensure all selected parameters exist
          const table = tableStore.currentTable.value
          if (table?.selectedParameters) {
            const { parent: parentParams, child: childParams } =
              table.selectedParameters

            // Add missing parent parameters
            parentParams.forEach((param: SelectedParameter) => {
              if (!parameters[param.id]) {
                const availableParam = createAvailableBimParameter(
                  {
                    id: param.id,
                    name: param.name,
                    value: null,
                    sourceGroup: param.group,
                    metadata: param.metadata || {}
                  },
                  param.type as BimValueType,
                  null
                )
                parameters[param.id] = availableParam.value
              }
            })

            // Add missing child parameters
            childParams.forEach((param: SelectedParameter) => {
              if (!parameters[param.id]) {
                const availableParam = createAvailableBimParameter(
                  {
                    id: param.id,
                    name: param.name,
                    value: null,
                    sourceGroup: param.group,
                    metadata: param.metadata || {}
                  },
                  param.type as BimValueType,
                  null
                )
                parameters[param.id] = availableParam.value
              }
            })
          }

          return {
            ...el,
            parameters
          }
        })

        // Update local data structures
        tableData.value = transformedElements
        childElementsList.value = childElements
        elementsMap.value = new Map(
          parentElements.map((parent) => [parent.mark || parent.id, parent])
        )

        // Extract parameters from updated elements
        await extractParameters()

        debug.log(DebugCategories.DATA_TRANSFORM, 'Local data updated', {
          tableData: tableData.value.length,
          childElements: childElementsList.value.length,
          parentElements: elementsMap.value.size
        })

        debug.log(DebugCategories.DATA_TRANSFORM, 'Elements processed', {
          total: updatedElements.length,
          parents: updatedElements.filter((el) => el.metadata?.isParent).length,
          children: updatedElements.filter((el) => el.isChild).length
        })
      } catch (err) {
        const error = logError(DebugCategories.ERROR, 'Error processing elements:', err)
        processingState.value.error = error
      } finally {
        processingState.value.isProcessingElements = false
      }
    }
  })

  const updateCategories = async (
    parentCategories: string[],
    childCategories: string[]
  ): Promise<void> => {
    debug.startState(DebugCategories.CATEGORY_UPDATES, 'Updating categories')

    // Skip if already processing
    if (processingState.value.isProcessingElements) {
      debug.warn(DebugCategories.CATEGORY_UPDATES, 'Already processing elements')
      return
    }

    processingState.value.isProcessingElements = true
    processingState.value.error = undefined

    try {
      debug.log(DebugCategories.CATEGORY_UPDATES, 'Category update started', {
        parentCategories,
        childCategories
      })

      // Update categories using dedicated methods
      store.setParentCategories(parentCategories)
      store.setChildCategories(childCategories)

      // Update BIM elements with new child categories
      await bimElements.initializeElements(
        isWorldTreeRoot(worldTree.value) ? worldTree.value : null
      )
      debug.log(DebugCategories.CATEGORY_UPDATES, 'BIM elements initialized')

      // Extract parameters with new categories
      await extractParameters()
      debug.log(DebugCategories.CATEGORY_UPDATES, 'Parameters extracted')

      debug.completeState(DebugCategories.CATEGORY_UPDATES, 'Categories updated')
    } catch (err: unknown) {
      const error = logError(DebugCategories.ERROR, 'Error updating categories:', err)
      processingState.value.error = error
      throw error
    } finally {
      processingState.value.isProcessingElements = false
    }
  }

  const initializeData = async (): Promise<void> => {
    if (processingState.value.isProcessingElements) {
      debug.warn(DebugCategories.INITIALIZATION, 'Already processing elements')
      return
    }

    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Initializing data')
      processingState.value.isProcessingElements = true

      // Initialize BIM elements
      await bimElements.initializeElements(
        isWorldTreeRoot(worldTree.value) ? worldTree.value : null
      )

      if (!bimElements.allElements.value?.length) {
        throw new Error('BIM elements initialization failed')
      }

      // Process elements and update data structures
      const elements = bimElements.allElements.value
      const updatedElements = elements.map((element) => {
        const category = element.category || 'Uncategorized'
        const isParent = options.selectedParentCategories.value.includes(category)
        const isChild = options.selectedChildCategories.value.includes(category)

        return {
          ...element,
          isChild,
          metadata: {
            ...element.metadata,
            isParent,
            category
          }
        }
      })

      // Group elements by selected categories
      const parentElements = updatedElements.filter((el) => el.metadata?.isParent)
      const childElements = updatedElements.filter((el) => el.isChild)

      // Transform elements with parameters
      const transformedElements = updatedElements.map((el) => {
        const parameters = { ...el.parameters }

        // Ensure all selected parameters exist
        const table = tableStore.currentTable.value
        if (table?.selectedParameters) {
          const { parent: parentParams, child: childParams } = table.selectedParameters

          // Add missing parent parameters
          parentParams.forEach((param: SelectedParameter) => {
            if (!parameters[param.id]) {
              const availableParam = createAvailableBimParameter(
                {
                  id: param.id,
                  name: param.name,
                  value: null,
                  sourceGroup: param.group,
                  metadata: param.metadata || {}
                },
                param.type as BimValueType,
                null
              )
              parameters[param.id] = availableParam.value
            }
          })

          // Add missing child parameters
          childParams.forEach((param: SelectedParameter) => {
            if (!parameters[param.id]) {
              const availableParam = createAvailableBimParameter(
                {
                  id: param.id,
                  name: param.name,
                  value: null,
                  sourceGroup: param.group,
                  metadata: param.metadata || {}
                },
                param.type as BimValueType,
                null
              )
              parameters[param.id] = availableParam.value
            }
          })
        }

        return {
          ...el,
          parameters
        }
      })

      // Update store with transformed elements
      await store.lifecycle.update({
        scheduleData: transformedElements,
        tableData: transformedElements,
        evaluatedData: transformedElements
      })

      debug.log(DebugCategories.INITIALIZATION, 'Store updated with elements', {
        total: transformedElements.length,
        parents: parentElements.length,
        children: childElements.length,
        parameters: transformedElements.reduce(
          (acc, el) => acc + Object.keys(el.parameters || {}).length,
          0
        )
      })

      // Update local data structures
      tableData.value = transformedElements
      childElementsList.value = childElements
      elementsMap.value = new Map(
        parentElements.map((parent) => [parent.mark || parent.id, parent])
      )

      debug.log(DebugCategories.INITIALIZATION, 'Local data structures updated', {
        tableData: tableData.value.length,
        childElements: childElementsList.value.length,
        parentElements: elementsMap.value.size
      })

      debug.log(DebugCategories.INITIALIZATION, 'Data structures updated', {
        total: updatedElements.length,
        tableData: tableData.value.length,
        parents: parentElements.length,
        children: childElements.length
      })

      // Extract parameters
      await extractParameters()
      debug.completeState(DebugCategories.INITIALIZATION, 'Data initialized')
    } catch (err: unknown) {
      const error = logError(DebugCategories.ERROR, 'Error initializing data:', err)
      processingState.value.error = error
      throw error
    } finally {
      processingState.value.isProcessingElements = false
    }
  }

  // Computed properties for state
  const isLoading = computed(() => processingState.value.isProcessingElements)
  const hasError = computed(() => !!processingState.value.error)

  const state = computed<DataState>(() => ({
    rawElements: scheduleData.value,
    parentElements: scheduleData.value.filter((el) => el.metadata?.isParent),
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

  // Direct reference to store data to avoid redundant transformations
  const scheduleData = computed<ElementData[]>(() => store.scheduleData.value || [])

  return {
    scheduleData,
    tableData,
    availableCategories: {
      parent: new Set(options.selectedParentCategories.value),
      child: new Set(options.selectedChildCategories.value)
    },
    updateCategories,
    initializeData,
    elementsMap,
    childElementsList,
    isLoading,
    hasError,
    state,
    processingState,
    allElements: computed(() => bimElements.allElements.value || [])
  }
}
