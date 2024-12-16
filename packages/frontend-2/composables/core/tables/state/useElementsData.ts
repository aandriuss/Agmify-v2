import { ref, computed, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type {
  ElementData,
  ProcessingState,
  TableRow,
  DataState
} from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from '~/composables/core/store'
import { defaultTable } from '~/components/viewer/schedules/config/defaultColumns'
import { useBIMElements } from './useBIMElements'

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
  const bimElements = useBIMElements()
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

  async function processElements() {
    if (!bimElements.allElements.value?.length) {
      debug.warn(DebugCategories.DATA, 'No BIM elements available')
      return
    }

    debug.startState(DebugCategories.INITIALIZATION, 'Processing elements')

    // Clear existing data
    elementsMap.value.clear()
    childElementsList.value = []

    // Get current categories or use defaults
    const selectedParentCats =
      options.selectedParentCategories.value.length > 0
        ? options.selectedParentCategories.value
        : defaultTable.categoryFilters.selectedParentCategories

    const selectedChildCats =
      options.selectedChildCategories.value.length > 0
        ? options.selectedChildCategories.value
        : defaultTable.categoryFilters.selectedChildCategories

    // Process all elements
    bimElements.allElements.value.forEach((element) => {
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

    // Update store with processed data
    try {
      await store.lifecycle.update({
        scheduleData: Array.from(elementsMap.value.values()),
        tableData: Array.from(elementsMap.value.values()).map((element) => ({
          ...element,
          visible: true
        }))
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update store:', err)
      throw err
    }

    debug.completeState(DebugCategories.INITIALIZATION, 'Elements processed')
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

  // Watch scheduleData changes and update store
  watch(
    scheduleData,
    async (newData) => {
      try {
        await store.lifecycle.update({
          scheduleData: newData,
          tableData: newData.map((element) => ({
            ...element,
            visible: true
          }))
        })
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to update store:', err)
        throw err
      }
    },
    { deep: true }
  )

  const updateCategories = async (
    parentCategories: string[],
    childCategories: string[]
  ): Promise<void> => {
    debug.startState(DebugCategories.CATEGORY_UPDATES, 'Updating categories')
    processingState.value.isProcessingElements = true
    processingState.value.error = undefined

    try {
      // Update store first
      await store.lifecycle.update({
        selectedParentCategories: parentCategories,
        selectedChildCategories: childCategories
      })

      await processElements()
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
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Initializing data')
      processingState.value.isProcessingElements = true

      await processElements()
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

  // Watch for BIM elements changes
  watch(
    bimElements.allElements,
    (newElements) => {
      if (newElements?.length) {
        processElements()
      }
    },
    { immediate: true }
  )

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
