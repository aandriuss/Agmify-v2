import { ref, computed, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type {
  ElementData,
  ProcessingState,
  TableRow,
  DataState,
  BimParameter,
  BimValueType
} from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from '~/composables/core/store'
import { defaultTable } from '~/components/viewer/schedules/config/defaultColumns'
import { useBIMElements } from './useBIMElements'
import { createBimParameterWithDefaults } from '~/composables/core/types'

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
  const bimElements = useBIMElements({
    childCategories: options.selectedChildCategories.value
  })
  const elementsMap = ref<Map<string, ElementData>>(new Map())
  const childElementsList = ref<ElementData[]>([])
  const tableData = ref<TableRow[]>([])

  // Track available parameters
  const availableParameters = ref({
    parent: new Map<string, BimParameter>(),
    child: new Map<string, BimParameter>()
  })

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

  async function processElements() {
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

    if (!parentCatsChanged && !childCatsChanged) {
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

    try {
      // Clear existing data
      elementsMap.value.clear()
      childElementsList.value = []
      availableParameters.value.parent.clear()
      availableParameters.value.child.clear()

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
        elementCount: bimElements.allElements.value.length
      })

      // Track parameter stats
      const parameterStats = {
        parent: {
          total: 0,
          unique: new Set<string>(),
          groups: new Map<string, Set<string>>()
        },
        child: {
          total: 0,
          unique: new Set<string>(),
          groups: new Map<string, Set<string>>()
        }
      }

      // Process all elements
      bimElements.allElements.value.forEach((element) => {
        const category = element.category || 'Uncategorized'
        const mark = element.mark || `Element-${element.id}`

        // Process parent elements
        const isParentCategory =
          selectedParentCats.length === 0 || selectedParentCats.includes(category)

        if (isParentCategory && !element.isChild) {
          elementsMap.value.set(mark, element)
          // Process parent parameters
          if (element.parameters) {
            // Log raw parameters for debugging
            debug.log(DebugCategories.PARAMETERS, 'Raw parent parameters', {
              category,
              mark,
              parameters: element.parameters
            })

            // First pass: collect all parameters and their groups
            const paramGroups = new Map<string, Set<string>>()
            Object.entries(element.parameters).forEach(([key, _value]) => {
              // Skip system parameters
              if (key.startsWith('__')) return

              // Extract group from parameter key
              const parts = key.split('.')
              const group = parts.length > 1 ? parts[0] : 'Parameters'
              const paramName = parts[parts.length - 1]

              if (!paramGroups.has(group)) {
                paramGroups.set(group, new Set())
              }
              paramGroups.get(group)!.add(paramName)
            })

            // Second pass: create parameters with proper grouping
            paramGroups.forEach((params, group) => {
              params.forEach((paramName) => {
                const key = group === 'Parameters' ? paramName : `${group}.${paramName}`
                const value = element.parameters![key] ?? element.parameters![paramName]

                if (value !== undefined) {
                  parameterStats.parent.total++
                  parameterStats.parent.unique.add(key)

                  // Track parameter group
                  if (!parameterStats.parent.groups.has(group)) {
                    parameterStats.parent.groups.set(group, new Set())
                  }
                  parameterStats.parent.groups.get(group)!.add(paramName)

                  // Add to available parameters
                  if (!availableParameters.value.parent.has(key)) {
                    const valueType = typeof value === 'number' ? 'number' : 'string'
                    availableParameters.value.parent.set(
                      key,
                      createBimParameterWithDefaults({
                        field: key,
                        name: paramName,
                        header: key,
                        category,
                        type: valueType as BimValueType,
                        sourceValue: value as string | number | boolean | null,
                        fetchedGroup: group,
                        currentGroup: group
                      })
                    )
                  }
                }
              })
            })
          }
        }

        // Process child elements
        const isChildCategory =
          selectedChildCats.length === 0 || selectedChildCats.includes(category)

        if (isChildCategory && element.isChild) {
          childElementsList.value.push(element)
          // Process child parameters
          if (element.parameters) {
            // Log raw parameters for debugging
            debug.log(DebugCategories.PARAMETERS, 'Raw child parameters', {
              category,
              mark,
              parameters: element.parameters
            })

            // First pass: collect all parameters and their groups
            const paramGroups = new Map<string, Set<string>>()
            Object.entries(element.parameters).forEach(([key, _value]) => {
              // Skip system parameters
              if (key.startsWith('__')) return

              // Extract group from parameter key
              const parts = key.split('.')
              const group = parts.length > 1 ? parts[0] : 'Parameters'
              const paramName = parts[parts.length - 1]

              if (!paramGroups.has(group)) {
                paramGroups.set(group, new Set())
              }
              paramGroups.get(group)!.add(paramName)
            })

            // Second pass: create parameters with proper grouping
            paramGroups.forEach((params, group) => {
              params.forEach((paramName) => {
                const key = group === 'Parameters' ? paramName : `${group}.${paramName}`
                const value = element.parameters![key] ?? element.parameters![paramName]

                if (value !== undefined) {
                  parameterStats.child.total++
                  parameterStats.child.unique.add(key)

                  // Track parameter group
                  if (!parameterStats.child.groups.has(group)) {
                    parameterStats.child.groups.set(group, new Set())
                  }
                  parameterStats.child.groups.get(group)!.add(paramName)

                  // Add to available parameters
                  if (!availableParameters.value.child.has(key)) {
                    const valueType = typeof value === 'number' ? 'number' : 'string'
                    availableParameters.value.child.set(
                      key,
                      createBimParameterWithDefaults({
                        field: key,
                        name: paramName,
                        header: key,
                        category,
                        type: valueType as BimValueType,
                        sourceValue: value as string | number | boolean | null,
                        fetchedGroup: group,
                        currentGroup: group
                      })
                    )
                  }
                }
              })
            })
          }
        }
      })

      debug.log(DebugCategories.DATA_TRANSFORM, 'Element processing stats', {
        parentElements: elementsMap.value.size,
        childElements: childElementsList.value.length,
        parameters: {
          parent: {
            total: parameterStats.parent.total,
            unique: parameterStats.parent.unique.size,
            groups: Object.fromEntries(
              Array.from(parameterStats.parent.groups.entries()).map(
                ([group, params]) => [group, Array.from(params)]
              )
            ),
            available: availableParameters.value.parent.size
          },
          child: {
            total: parameterStats.child.total,
            unique: parameterStats.child.unique.size,
            groups: Object.fromEntries(
              Array.from(parameterStats.child.groups.entries()).map(
                ([group, params]) => [group, Array.from(params)]
              )
            ),
            available: availableParameters.value.child.size
          }
        }
      })

      // Update store with processed data
      try {
        const processedData = Array.from(elementsMap.value.values()).map((element) => ({
          ...element,
          visible: true,
          details: childElementsList.value
            .filter((child) => child.host === element.mark)
            .map((child) => ({
              ...child,
              host: element.mark,
              visible: true
            }))
        }))

        await store.lifecycle.update({
          scheduleData: processedData,
          tableData: processedData
        })

        // Update parameters using setParameters
        await store.setParameters({
          parent: Array.from(availableParameters.value.parent.values()),
          child: Array.from(availableParameters.value.child.values())
        })

        debug.log(DebugCategories.DATA_TRANSFORM, 'Store updated', {
          processedCount: processedData.length,
          withDetails: processedData.filter((d) => d.details?.length > 0).length,
          parameters: {
            parent: availableParameters.value.parent.size,
            child: availableParameters.value.child.size
          }
        })
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to update store:', err)
        throw err
      }

      debug.completeState(DebugCategories.INITIALIZATION, 'Elements processed')
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
        // Update BIM elements with new child categories
        await bimElements.initializeElements()
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
      if (
        !processingState.value.isProcessingElements &&
        newElements?.length &&
        JSON.stringify(newElements) !== JSON.stringify(oldElements)
      ) {
        await processElements()
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
