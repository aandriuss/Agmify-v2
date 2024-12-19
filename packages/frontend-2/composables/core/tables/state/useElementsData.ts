import { ref, computed, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type {
  ElementData,
  ProcessingState,
  TableRow,
  DataState
} from '~/composables/core/types'
import type { ParameterValue } from '~/composables/core/types/parameters'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from '~/composables/core/store'
import { defaultTable } from '~/components/viewer/schedules/config/defaultColumns'
import { useBIMElements } from './useBIMElements'
import { useParameterStore } from '~/composables/core/parameters/store'
import type { RawParameter } from '~/composables/core/parameters/store/types'
import { extractRawParameters } from '~/composables/core/parameters/next/utils/parameter-processing'

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
}

export function useElementsData(
  options: UseElementsDataOptions
): UseElementsDataReturn {
  const store = useStore()
  const parameterStore = useParameterStore()
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

  // Track last processed categories to prevent unnecessary reprocessing
  const lastProcessedCategories = ref({
    parent: [] as string[],
    child: [] as string[]
  })

  async function processParametersInChunks(
    elements: ElementData[],
    chunkSize = 100
  ): Promise<RawParameter[]> {
    const chunks = []
    for (let i = 0; i < elements.length; i += chunkSize) {
      chunks.push(elements.slice(i, i + chunkSize))
    }

    debug.log(DebugCategories.PARAMETERS, 'Processing parameters in chunks', {
      totalElements: elements.length,
      chunkSize,
      chunkCount: chunks.length
    })

    const rawParams: RawParameter[] = []

    for (const chunk of chunks) {
      // Process chunk using centralized parameter extraction
      const chunkParams = extractRawParameters(chunk)
      rawParams.push(...chunkParams)

      // Allow other tasks to run between chunks
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    debug.log(DebugCategories.PARAMETERS, 'Parameter extraction complete', {
      extractedCount: rawParams.length
    })

    return rawParams
  }

  async function processParameters(elements: ElementData[], isParent: boolean) {
    debug.startState(
      DebugCategories.PARAMETERS,
      `Processing ${isParent ? 'parent' : 'child'} parameters`
    )

    // Extract and validate raw parameters using chunked processing
    const extractedParams = await processParametersInChunks(elements)
    if (!Array.isArray(extractedParams)) {
      throw new Error('Failed to extract parameters: Invalid response format')
    }

    debug.log(DebugCategories.PARAMETERS, 'Raw parameters extracted', {
      count: extractedParams.length,
      isParent,
      sample: extractedParams[0]
    })

    // Update total count for progress tracking
    if (processingState.value.totalCount === 0) {
      processingState.value.totalCount = extractedParams.length
    } else {
      // Add to total count for subsequent runs
      processingState.value.totalCount += extractedParams.length
    }

    // Process parameters using parameter store
    await parameterStore.processRawParameters(extractedParams, isParent)

    // Get store state after processing
    const storeState = isParent
      ? {
          raw: parameterStore.parentRawParameters.value,
          available: {
            bim: parameterStore.parentAvailableBimParameters.value,
            user: parameterStore.parentAvailableUserParameters.value
          },
          selected: parameterStore.parentSelectedParameters.value,
          columns: parameterStore.parentColumnDefinitions.value
        }
      : {
          raw: parameterStore.childRawParameters.value,
          available: {
            bim: parameterStore.childAvailableBimParameters.value,
            user: parameterStore.childAvailableUserParameters.value
          },
          selected: parameterStore.childSelectedParameters.value,
          columns: parameterStore.childColumnDefinitions.value
        }

    // Log detailed parameter store state after processing
    debug.log(DebugCategories.PARAMETERS, 'Parameter store state after processing', {
      type: isParent ? 'parent' : 'child',
      extracted: {
        count: extractedParams.length,
        sample: extractedParams[0]
      },
      store: {
        raw: {
          count: storeState.raw.length,
          sample: storeState.raw[0]
        },
        available: {
          bim: {
            count: storeState.available.bim.length,
            sample: storeState.available.bim[0]
          },
          user: {
            count: storeState.available.user.length,
            sample: storeState.available.user[0]
          }
        },
        selected: {
          count: storeState.selected.length,
          sample: storeState.selected[0]
        },
        columns: {
          count: storeState.columns.length,
          sample: storeState.columns[0]
        }
      }
    })

    debug.completeState(
      DebugCategories.PARAMETERS,
      `Completed ${isParent ? 'parent' : 'child'} parameter processing`
    )
  }

  async function processElementsInChunks(
    elements: ElementData[],
    selectedParentCats: string[],
    selectedChildCats: string[],
    chunkSize = 100
  ) {
    const chunks = []
    for (let i = 0; i < elements.length; i += chunkSize) {
      chunks.push(elements.slice(i, i + chunkSize))
    }

    debug.log(DebugCategories.DATA_TRANSFORM, 'Processing elements in chunks', {
      totalElements: elements.length,
      chunkSize,
      chunkCount: chunks.length
    })

    let processedCount = 0
    const totalCount = elements.length

    for (const [index, chunk] of chunks.entries()) {
      // Process chunk
      chunk.forEach((element) => {
        const category = element.category || 'Uncategorized'
        const mark = element.mark || `Element-${element.id}`

        // Process parent elements
        const isParentCategory =
          selectedParentCats.length === 0 || selectedParentCats.includes(category)

        if (isParentCategory && !element.isChild) {
          elementsMap.value.set(mark, element)
        }

        // Process child elements
        const isChildCategory =
          selectedChildCats.length === 0 || selectedChildCats.includes(category)

        if (isChildCategory && element.isChild) {
          childElementsList.value.push(element)
        }
      })

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

    debug.log(DebugCategories.DATA_TRANSFORM, 'Chunks processed', {
      parentElements: elementsMap.value.size,
      childElements: childElementsList.value.length,
      totalProcessed: processedCount,
      processingTime: `${Date.now() - performance.now()}ms`
    })
  }

  async function processElements(forceProcess = false) {
    if (!bimElements.allElements.value?.length) {
      debug.warn(DebugCategories.DATA, 'No BIM elements available')
      return
    }

    // Prevent processing while already processing
    if (processingState.value.isProcessingElements) {
      debug.warn(DebugCategories.DATA, 'Already processing elements')
      return
    }

    // Get current categories
    const currentParentCats = options.selectedParentCategories.value
    const currentChildCats = options.selectedChildCategories.value

    // Check if categories have changed
    const parentCatsChanged =
      JSON.stringify(currentParentCats) !==
      JSON.stringify(lastProcessedCategories.value.parent)
    const childCatsChanged =
      JSON.stringify(currentChildCats) !==
      JSON.stringify(lastProcessedCategories.value.child)

    // Skip if no changes and not forcing process
    if (!forceProcess && !parentCatsChanged && !childCatsChanged) {
      debug.log(
        DebugCategories.DATA_TRANSFORM,
        'Skipping process - categories unchanged'
      )
      return
    }

    // Update last processed categories
    lastProcessedCategories.value = {
      parent: [...currentParentCats],
      child: [...currentChildCats]
    }

    debug.startState(DebugCategories.INITIALIZATION, 'Processing elements')
    processingState.value.isProcessingElements = true
    processingState.value.processedCount = 0
    processingState.value.totalCount = 0
    processingState.value.error = undefined

    try {
      // Clear existing data
      elementsMap.value.clear()
      childElementsList.value = []

      // Get current categories or use defaults
      const selectedParentCats =
        currentParentCats.length > 0
          ? currentParentCats
          : defaultTable.categoryFilters.selectedParentCategories

      const selectedChildCats =
        currentChildCats.length > 0
          ? currentChildCats
          : defaultTable.categoryFilters.selectedChildCategories

      debug.log(DebugCategories.DATA_TRANSFORM, 'Processing with categories', {
        selectedParentCats,
        selectedChildCats,
        elementCount: bimElements.allElements.value.length,
        forceProcess
      })

      // Process elements in chunks
      await processElementsInChunks(
        bimElements.allElements.value,
        selectedParentCats,
        selectedChildCats
      )

      try {
        const parentElements = Array.from(elementsMap.value.values())
        const childElements = childElementsList.value

        // Process parameters in parallel
        const results = await Promise.allSettled([
          processParameters(parentElements, true),
          processParameters(childElements, false)
        ])

        // Handle any errors from parallel processing
        const errors: Error[] = []
        const paramTypes = ['parent', 'child'] as const

        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const paramType = paramTypes[index]
            const error = result.reason as Error | unknown
            const formattedError =
              error instanceof Error
                ? error
                : new Error(
                    `Failed to process ${paramType} parameters: ${String(error)}`
                  )

            debug.error(
              DebugCategories.ERROR,
              `Error processing ${paramType} parameters:`,
              formattedError
            )
            errors.push(formattedError)
          }
        })

        if (errors.length > 0) {
          const errorMessage = errors.map((err) => err.message).join('\n')
          throw new Error(`Parameter processing failed:\n${errorMessage}`)
        }

        // Create table data with processed parameters
        debug.log(DebugCategories.DATA_TRANSFORM, 'Creating table data', {
          parentCount: elementsMap.value.size,
          childCount: childElementsList.value.length,
          parameters: {
            parent: {
              raw: parameterStore.parentRawParameters.value.length,
              available: {
                bim: parameterStore.parentAvailableBimParameters.value.length,
                user: parameterStore.parentAvailableUserParameters.value.length
              },
              selected: parameterStore.parentSelectedParameters.value.length,
              columns: parameterStore.parentColumnDefinitions.value.length
            },
            child: {
              raw: parameterStore.childRawParameters.value.length,
              available: {
                bim: parameterStore.childAvailableBimParameters.value.length,
                user: parameterStore.childAvailableUserParameters.value.length
              },
              selected: parameterStore.childSelectedParameters.value.length,
              columns: parameterStore.childColumnDefinitions.value.length
            }
          }
        })

        // Map elements to table rows with processed parameters
        const processedData = Array.from(elementsMap.value.values()).map((element) => {
          // Get only visible selected parent parameters from parameter store
          const parentParams = parameterStore.parentSelectedParameters.value
            .filter((param) => param.visible)
            .reduce((acc, param) => {
              if (param.value !== undefined) {
                acc[param.id] = param.value as ParameterValue
              }
              return acc
            }, {} as Record<string, ParameterValue>)

          // Create parent row
          const parentRow: ElementData = {
            ...element,
            visible: true,
            parameters: parentParams,
            details: childElementsList.value
              .filter((child) => child.host === element.mark)
              .map((child) => {
                // Get only visible selected child parameters from parameter store
                const childParams = parameterStore.childSelectedParameters.value
                  .filter((param) => param.visible)
                  .reduce((acc, param) => {
                    if (param.value !== undefined) {
                      acc[param.id] = param.value as ParameterValue
                    }
                    return acc
                  }, {} as Record<string, ParameterValue>)

                // Create child row
                return {
                  ...child,
                  host: element.mark,
                  visible: true,
                  parameters: childParams
                } as ElementData
              })
          }

          return parentRow
        })

        // Update store with processed data
        await store.lifecycle.update({
          scheduleData: processedData,
          tableData: processedData
        })

        debug.log(DebugCategories.DATA_TRANSFORM, 'Store updated', {
          processedCount: processedData.length,
          withDetails: processedData.filter((d) => d.details?.length ?? 0 > 0).length,
          visibleParameters: {
            parent: parameterStore.parentSelectedParameters.value.filter(
              (p) => p.visible
            ).length,
            child: parameterStore.childSelectedParameters.value.filter((p) => p.visible)
              .length
          },
          processingTime: `${Date.now() - performance.now()}ms`
        })

        debug.completeState(DebugCategories.INITIALIZATION, 'Elements processed')
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Error processing parameters:', err)
        processingState.value.error =
          err instanceof Error ? err : new Error('Failed to process parameters')
        throw err
      }
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Error processing elements:', err)
      processingState.value.error =
        err instanceof Error ? err : new Error('Failed to process elements')
      throw err
    } finally {
      processingState.value.isProcessingElements = false
    }
  }

  const scheduleData = computed<ElementData[]>(() => {
    const parentsWithChildren = Array.from(elementsMap.value.values()).map(
      (parent) => ({
        ...parent,
        details:
          options.selectedChildCategories.value.length > 0
            ? childElementsList.value
                .filter((child) => child.host === parent.mark)
                .map((child) => ({
                  ...child,
                  host: parent.mark
                }))
            : []
      })
    )

    let result = [...parentsWithChildren]

    // Add unattached children if child categories are selected
    if (options.selectedChildCategories.value.length > 0) {
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

      result = [...result, ...unattachedChildren]
    }

    // Add unmarked parents
    const unmarkedParents = Array.from(elementsMap.value.values())
      .filter((parent) => !parent.mark)
      .map((parent) => ({
        ...parent,
        mark: 'No Mark',
        details: []
      }))

    return [...result, ...unmarkedParents]
  })

  // Watch category changes
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

        // Skip if already processing
        if (processingState.value.isProcessingElements) {
          debug.warn(DebugCategories.CATEGORY_UPDATES, 'Already processing elements')
          return
        }

        try {
          debug.startState(
            DebugCategories.CATEGORY_UPDATES,
            'Processing category change'
          )
          processingState.value.isProcessingElements = true

          // Update BIM elements with new child categories
          await bimElements.initializeElements()
          debug.log(DebugCategories.CATEGORY_UPDATES, 'BIM elements initialized')

          // Force process with new categories
          await processElements(true)
          debug.log(DebugCategories.CATEGORY_UPDATES, 'Elements processed')

          debug.completeState(
            DebugCategories.CATEGORY_UPDATES,
            'Category change processed'
          )
        } catch (err) {
          debug.error(DebugCategories.ERROR, 'Error processing category change:', err)
          processingState.value.error =
            err instanceof Error ? err : new Error('Failed to process category change')
          throw err
        } finally {
          processingState.value.isProcessingElements = false
        }
      }
    },
    { deep: true }
  )

  // Watch for BIM elements changes
  watch(
    bimElements.allElements,
    async (newElements, oldElements) => {
      debug.log(DebugCategories.DATA_TRANSFORM, 'BIM elements changed', {
        newCount: newElements?.length,
        oldCount: oldElements?.length,
        processing: processingState.value.isProcessingElements,
        categories: {
          parent: options.selectedParentCategories.value,
          child: options.selectedChildCategories.value
        }
      })

      // Only process if elements actually changed and we're not already processing
      if (!processingState.value.isProcessingElements && newElements?.length) {
        // Force process on initial watch trigger (when oldElements is undefined)
        const isInitialTrigger = oldElements === undefined
        await processElements(isInitialTrigger)
      }
    },
    { immediate: true }
  )

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

      // Update store first
      await store.lifecycle.update({
        selectedParentCategories: parentCategories,
        selectedChildCategories: childCategories
      })

      // Update BIM elements with new child categories
      await bimElements.initializeElements()
      debug.log(DebugCategories.CATEGORY_UPDATES, 'BIM elements initialized')

      // Force process elements and parameters with new categories
      await processElements(true)
      debug.log(DebugCategories.CATEGORY_UPDATES, 'Elements and parameters processed')

      // Wait for Vue to update the DOM
      await new Promise((resolve) => requestAnimationFrame(resolve))

      debug.completeState(DebugCategories.CATEGORY_UPDATES, 'Categories updated')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Error updating categories:', err)
      processingState.value.error =
        err instanceof Error ? err : new Error('Failed to update categories')
      throw err
    } finally {
      processingState.value.isProcessingElements = false
    }
  }

  const initializeData = async (): Promise<void> => {
    // Skip if already processing
    if (processingState.value.isProcessingElements) {
      debug.warn(DebugCategories.INITIALIZATION, 'Already processing elements')
      return
    }

    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Initializing data')
      processingState.value.isProcessingElements = true

      // Initialize BIM elements first
      await bimElements.initializeElements()
      debug.log(DebugCategories.INITIALIZATION, 'BIM elements initialized')

      // Force process elements and parameters
      await processElements(true)
      debug.log(DebugCategories.INITIALIZATION, 'Elements and parameters processed')

      // Wait for Vue to update the DOM
      await new Promise((resolve) => requestAnimationFrame(resolve))

      debug.completeState(DebugCategories.INITIALIZATION, 'Data initialized')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Error initializing data:', err)
      processingState.value.error =
        err instanceof Error ? err : new Error('Failed to initialize data')
      throw err
    } finally {
      processingState.value.isProcessingElements = false
    }
  }

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
    processingState
  }
}
