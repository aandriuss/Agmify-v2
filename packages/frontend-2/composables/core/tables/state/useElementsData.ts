import { ref, computed, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type {
  ElementData,
  ProcessingState,
  TableRow,
  DataState
} from '~/composables/core/types'
import { createBimColumnDefWithDefaults } from '~/composables/core/types'
import type { ParameterValue } from '~/composables/core/types/parameters'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from '~/composables/core/store'
import { useBIMElements } from './useBIMElements'
import { useParameterStore } from '~/composables/core/parameters/store'
import { convertToParameterValue } from '~/composables/core/parameters/next/utils/parameter-processing'
import { createSelectedParameter } from '~/composables/core/types/parameters/parameter-states'
import { useTableFlow } from '~/composables/core/tables/state/useTableFlow'

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

  // Initialize table flow
  const {
    initialize: initializeTable,
    isInitialized: _isInitialized,
    error: _tableError
  } = useTableFlow({
    currentTable: computed(() => null), // No current table, use defaults
    defaultConfig: {
      id: 'default-table',
      name: 'Default Table',
      displayName: 'Default Table',
      parentColumns: [],
      childColumns: [],
      categoryFilters: {
        selectedParentCategories: [],
        selectedChildCategories: []
      },
      selectedParameterIds: [],
      lastUpdateTimestamp: Date.now()
    }
  })

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

    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Processing elements')
      processingState.value.isProcessingElements = true
      processingState.value.processedCount = 0
      processingState.value.totalCount = 0
      processingState.value.error = undefined

      // Clear existing data
      elementsMap.value.clear()
      childElementsList.value = []

      const selectedParentCats = options.selectedParentCategories.value
      const selectedChildCats = options.selectedChildCategories.value

      // Process elements in chunks
      await processElementsInChunks(
        bimElements.allElements.value,
        selectedParentCats,
        selectedChildCats
      )

      try {
        const parentElements = Array.from(elementsMap.value.values())
        const childElements = childElementsList.value

        debug.log(DebugCategories.DATA_TRANSFORM, 'Processing parameters', {
          parentCount: parentElements.length,
          childCount: childElements.length
        })

        // Extract and process parameters
        debug.log(DebugCategories.PARAMETERS, 'Processing parameters', {
          parentCount: parentElements.length,
          childCount: childElements.length
        })

        // Get current parameter state
        const parentState = {
          raw: parameterStore.parentRawParameters.value || [],
          available: {
            bim: parameterStore.parentAvailableBimParameters.value || [],
            user: parameterStore.parentAvailableUserParameters.value || []
          },
          selected: parameterStore.parentSelectedParameters.value || [],
          columns: parameterStore.parentColumnDefinitions.value || []
        }

        const childState = {
          raw: parameterStore.childRawParameters.value || [],
          available: {
            bim: parameterStore.childAvailableBimParameters.value || [],
            user: parameterStore.childAvailableUserParameters.value || []
          },
          selected: parameterStore.childSelectedParameters.value || [],
          columns: parameterStore.childColumnDefinitions.value || []
        }

        // Verify parameters exist
        if (!parentState.raw.length && !childState.raw.length) {
          debug.error(DebugCategories.PARAMETERS, 'No parameters found in store', {
            parentElements: parentElements.length,
            childElements: childElements.length
          })
          throw new Error('No parameters found in store')
        }

        debug.log(DebugCategories.PARAMETERS, 'Using parameters from store', {
          parent: {
            raw: parentState.raw.length,
            available: {
              bim: parentState.available.bim.length,
              user: parentState.available.user.length
            },
            selected: parentState.selected.length,
            columns: parentState.columns.length
          },
          child: {
            raw: childState.raw.length,
            available: {
              bim: childState.available.bim.length,
              user: childState.available.user.length
            },
            selected: childState.selected.length,
            columns: childState.columns.length
          }
        })

        // Log parameter groups for debugging
        const parameterGroups = {
          parent: Array.from(
            new Set(
              parentElements.flatMap((el) =>
                Object.keys(el.parameters || {}).map((key) => key.split('.')[0])
              )
            )
          ),
          child: Array.from(
            new Set(
              childElements.flatMap((el) =>
                Object.keys(el.parameters || {}).map((key) => key.split('.')[0])
              )
            )
          )
        }

        debug.log(DebugCategories.PARAMETERS, 'Parameter groups found', parameterGroups)

        debug.log(DebugCategories.PARAMETERS, 'Parameters processed', {
          parent: parentState
            ? {
                raw: parentState.raw?.length || 0,
                available: {
                  bim: parentState.available.bim?.length || 0,
                  user: parentState.available.user?.length || 0
                }
              }
            : { raw: 0, available: { bim: 0, user: 0 } },
          child: childState
            ? {
                raw: childState.raw?.length || 0,
                available: {
                  bim: childState.available.bim?.length || 0,
                  user: childState.available.user?.length || 0
                }
              }
            : { raw: 0, available: { bim: 0, user: 0 } }
        })

        // Create table data with processed parameters
        const processedData = Array.from(elementsMap.value.values()).map((element) => {
          // Get selected parent parameters from parameter store
          const parentParams = (
            parameterStore.parentSelectedParameters.value || []
          ).reduce<Record<string, ParameterValue>>((acc, param) => {
            // Only include visible parameters
            if (param.visible) {
              // Handle nested parameters
              if (param.metadata?.isNested && param.metadata.parentKey) {
                // Get parent value and parse nested value
                const parentValue = element.parameters[param.metadata.parentKey]
                if (typeof parentValue === 'string' && parentValue.startsWith('{')) {
                  try {
                    const parsed = JSON.parse(parentValue) as Record<string, unknown>
                    const nestedValue = parsed[param.name]
                    if (nestedValue !== undefined) {
                      acc[param.id] = convertToParameterValue(nestedValue)
                    }
                  } catch (err) {
                    debug.warn(
                      DebugCategories.PARAMETERS,
                      `Failed to parse nested parameter ${param.id}:`,
                      err
                    )
                  }
                }
              } else {
                // Get regular parameter value and convert it properly
                const value = element.parameters[param.id]
                if (value !== undefined) {
                  acc[param.id] = convertToParameterValue(value)
                }
              }
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
                // Get selected child parameters from parameter store
                const childParams = (
                  parameterStore.childSelectedParameters.value || []
                ).reduce<Record<string, ParameterValue>>((acc, param) => {
                  // Only include visible parameters
                  if (param.visible) {
                    // Handle nested parameters
                    if (param.metadata?.isNested && param.metadata.parentKey) {
                      // Get parent value and parse nested value
                      const parentValue = child.parameters[param.metadata.parentKey]
                      if (
                        typeof parentValue === 'string' &&
                        parentValue.startsWith('{')
                      ) {
                        try {
                          const parsed = JSON.parse(parentValue) as Record<
                            string,
                            unknown
                          >
                          const nestedValue = parsed[param.name]
                          if (nestedValue !== undefined) {
                            acc[param.id] = convertToParameterValue(nestedValue)
                          }
                        } catch (err) {
                          debug.warn(
                            DebugCategories.PARAMETERS,
                            `Failed to parse nested parameter ${param.id}:`,
                            err
                          )
                        }
                      }
                    } else {
                      // Get regular parameter value and convert it properly
                      const value = child.parameters[param.id]
                      if (value !== undefined) {
                        acc[param.id] = convertToParameterValue(value)
                      }
                    }
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
          parameters: {
            parent: parentState
              ? {
                  raw: parentState.raw?.length || 0,
                  available: {
                    bim: parentState.available.bim?.length || 0,
                    user: parentState.available.user?.length || 0
                  },
                  selected: parentState.selected?.length || 0,
                  columns: parentState.columns?.length || 0
                }
              : { raw: 0, available: { bim: 0, user: 0 }, selected: 0, columns: 0 },
            child: childState
              ? {
                  raw: childState.raw?.length || 0,
                  available: {
                    bim: childState.available.bim?.length || 0,
                    user: childState.available.user?.length || 0
                  },
                  selected: childState.selected?.length || 0,
                  columns: childState.columns?.length || 0
                }
              : { raw: 0, available: { bim: 0, user: 0 }, selected: 0, columns: 0 }
          }
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

    // Only process if elements actually changed and we're not already processing
    if (!processingState.value.isProcessingElements && newElements?.length) {
      await processElements(true)
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

      // Initialize BIM elements first to get parameters
      await bimElements.initializeElements()
      debug.log(DebugCategories.INITIALIZATION, 'BIM elements initialized')

      // Process elements and parameters
      await processElements(true)
      debug.log(DebugCategories.INITIALIZATION, 'Elements and parameters processed')

      // Create default columns from available parameters
      const parentColumns = parameterStore.parentAvailableBimParameters.value.map(
        (param, index) => {
          const selected = createSelectedParameter(param, index)
          return createBimColumnDefWithDefaults({
            id: selected.id,
            name: selected.name,
            field: selected.id,
            header: selected.name,
            visible: selected.visible,
            removable: false,
            order: selected.order,
            description: selected.description,
            category: selected.category,
            type: param.type,
            sourceValue: typeof param.value === 'object' ? null : param.value,
            fetchedGroup: param.sourceGroup,
            currentGroup: param.sourceGroup
          })
        }
      )

      const childColumns = parameterStore.childAvailableBimParameters.value.map(
        (param, index) => {
          const selected = createSelectedParameter(param, index)
          return createBimColumnDefWithDefaults({
            id: selected.id,
            name: selected.name,
            field: selected.id,
            header: selected.name,
            visible: selected.visible,
            removable: false,
            order: selected.order,
            description: selected.description,
            category: selected.category,
            type: param.type,
            sourceValue: typeof param.value === 'object' ? null : param.value,
            fetchedGroup: param.sourceGroup,
            currentGroup: param.sourceGroup
          })
        }
      )

      // Initialize table with default columns
      await initializeTable()
      debug.log(DebugCategories.INITIALIZATION, 'Table initialized')

      // Update store with default columns
      await store.lifecycle.update({
        parentBaseColumns: parentColumns,
        parentVisibleColumns: parentColumns,
        childBaseColumns: childColumns,
        childVisibleColumns: childColumns
      })

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
