import { ref, computed, watch } from 'vue'
import type {
  ElementData,
  ProcessingState,
  TableRow,
  ElementsDataReturn,
  ViewerTree
} from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import { useDebug, DebugCategories } from '../debug/useDebug'
import { useBIMElements } from './useBIMElements'
import { processDataPipeline } from '../utils/dataPipeline'
import { useStore } from '../core/store'

export function useElementsData({
  selectedParentCategories,
  selectedChildCategories
}: {
  selectedParentCategories: Ref<string[]>
  selectedChildCategories: Ref<string[]>
}): ElementsDataReturn {
  const debug = useDebug()
  const store = useStore()
  const {
    allElements,
    rawWorldTree,
    rawTreeNodes,
    isLoading: bimLoading,
    hasError: bimError,
    stopWorldTreeWatch,
    initializeElements
  } = useBIMElements()

  // Initialize processing state
  const processingState = ref<ProcessingState>({
    isInitializing: false,
    isProcessingElements: false,
    isUpdatingCategories: false,
    isProcessingFullData: false,
    error: null
  })

  // Create refs for data
  const filteredElementsRef = ref<ElementData[]>([])
  const scheduleDataRef = ref<ElementData[]>([])
  const tableDataRef = ref<TableRow[]>([])

  // Update data when source data or categories change
  const updateData = async (elements: ElementData[]) => {
    try {
      if (!elements?.length) {
        debug.warn(DebugCategories.DATA, 'No elements available for processing')
        filteredElementsRef.value = []
        return
      }

      debug.startState(DebugCategories.DATA_TRANSFORM, 'Processing data', {
        elementCount: elements.length,
        selectedParent: selectedParentCategories.value,
        selectedChild: selectedChildCategories.value
      })
      processingState.value.isProcessingElements = true

      // Process data through unified pipeline
      const result = processDataPipeline({
        allElements: elements,
        selectedParent: selectedParentCategories.value,
        selectedChild: selectedChildCategories.value
      })

      // Helper to preserve column settings
      const preserveColumnSettings = (
        newColumns: ColumnDef[],
        existingColumns: ColumnDef[]
      ): ColumnDef[] => {
        return newColumns.map((newCol) => {
          const existingCol = existingColumns.find((col) => col.field === newCol.field)
          if (existingCol) {
            return {
              ...newCol,
              visible: existingCol.visible ?? true,
              order: existingCol.order ?? 0,
              isFetched: existingCol.isFetched ?? true,
              isFixed: existingCol.isFixed ?? false,
              isCustomParameter: existingCol.isCustomParameter ?? false
            }
          }
          return {
            ...newCol,
            visible: true,
            order: 0,
            isFetched: true,
            isFixed: false,
            isCustomParameter: false
          }
        })
      }

      // Get current column settings
      const currentParentColumns = store.parentVisibleColumns.value || []
      const currentChildColumns = store.childVisibleColumns.value || []

      // Create available columns (base + custom)
      const parentAvailableColumns = preserveColumnSettings(
        result.parentColumns,
        currentParentColumns
      )
      const childAvailableColumns = preserveColumnSettings(
        result.childColumns,
        currentChildColumns
      )

      // Create visible columns (initially same as available)
      const parentVisibleColumns = parentAvailableColumns.map((col) => ({
        ...col,
        visible: true
      }))
      const childVisibleColumns = childAvailableColumns.map((col) => ({
        ...col,
        visible: true
      }))

      // Update store with processed data
      await store.lifecycle.update({
        scheduleData: result.filteredElements,
        evaluatedData: result.processedElements,
        tableData: result.tableData,
        // Update all column-related fields
        parentBaseColumns: result.parentColumns,
        parentAvailableColumns,
        parentVisibleColumns,
        childBaseColumns: result.childColumns,
        childAvailableColumns,
        childVisibleColumns,
        // Preserve table settings
        selectedTableId: store.selectedTableId.value,
        currentTableId: store.currentTableId.value,
        tableName: store.tableName.value,
        tableKey: store.tableKey.value,
        tablesArray: store.tablesArray.value,
        initialized: true
      })

      // Update local refs
      filteredElementsRef.value = result.filteredElements
      scheduleDataRef.value = result.filteredElements
      tableDataRef.value = result.tableData

      // Count children correctly by looking at details arrays
      const totalChildren = result.tableData.reduce(
        (acc, row) => acc + (row.details?.length || 0),
        0
      )

      debug.completeState(DebugCategories.DATA_TRANSFORM, 'Data processing complete', {
        filteredCount: result.filteredElements.length,
        processedCount: result.processedElements.length,
        parentColumnCount: parentAvailableColumns.length,
        childColumnCount: childAvailableColumns.length,
        parents: result.tableData.filter((row) => !row.isChild).length,
        children: totalChildren,
        childrenByParent: result.tableData
          .filter((row) => row.details?.length)
          .map((row) => ({
            parentMark: row.mark,
            childCount: row.details?.length || 0,
            children: row.details?.map((child) => ({
              mark: child.mark,
              category: child.category
            }))
          })),
        parentColumns: parentAvailableColumns.map((c) => c.field),
        childColumns: childAvailableColumns.map((c) => c.field)
      })
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error processing data:', error)
      processingState.value.error =
        error instanceof Error ? error : new Error(String(error))
    } finally {
      processingState.value.isProcessingElements = false
    }
  }

  // Watch for BIM elements changes
  watch(
    () => allElements.value,
    async (newElements) => {
      if (newElements?.length) {
        await updateData(newElements)
      }
    },
    { immediate: true }
  )

  // Watch for category changes
  watch(
    [selectedParentCategories, selectedChildCategories],
    async ([parentCats, childCats]) => {
      debug.log(DebugCategories.CATEGORIES, 'Categories changed', {
        parent: parentCats,
        child: childCats
      })
      if (allElements.value?.length) {
        await updateData(allElements.value)
      }
    },
    { deep: true }
  )

  // Initialize data
  const initializeData = async (): Promise<void> => {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Initializing data')
      processingState.value.isInitializing = true

      // Initialize elements without any category assumptions
      await initializeElements()

      if (allElements.value?.length) {
        await updateData(allElements.value)
      }

      debug.completeState(
        DebugCategories.INITIALIZATION,
        'Data initialization complete'
      )
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
  const updateCategories = async (
    parentCategories: string[],
    childCategories: string[]
  ): Promise<void> => {
    try {
      debug.startState(DebugCategories.CATEGORY_UPDATES, 'Updating categories', {
        parent: parentCategories,
        child: childCategories
      })
      processingState.value.isUpdatingCategories = true
      processingState.value.error = null

      if (!allElements.value?.length) {
        debug.warn(
          DebugCategories.DATA,
          'Waiting for elements before updating categories'
        )
        return
      }

      await updateData(allElements.value)

      debug.completeState(DebugCategories.CATEGORY_UPDATES, 'Category update complete')
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error updating categories:', error)
      processingState.value.error =
        error instanceof Error ? error : new Error('Failed to update categories')
      throw error
    } finally {
      processingState.value.isUpdatingCategories = false
    }
  }

  // Return object with corrected child element computations
  return {
    scheduleData: scheduleDataRef,
    tableData: tableDataRef,
    availableCategories: computed(() => ({
      parent: new Set(selectedParentCategories.value),
      child: new Set(selectedChildCategories.value)
    })),
    updateCategories,
    initializeData,
    stopWorldTreeWatch,
    isLoading: computed(
      () => bimLoading.value || processingState.value.isProcessingElements
    ),
    hasError: computed(() => bimError.value || !!processingState.value.error),
    processingState,
    rawWorldTree: rawWorldTree as Ref<ViewerTree | null>,
    rawTreeNodes,
    rawElements: allElements,
    parentElements: computed(() =>
      tableDataRef.value
        .filter((row) => !row.isChild)
        .map((row) => ({
          ...row,
          details: row.details || [] // Ensure details is always an array
        }))
    ) as Ref<ElementData[]>,
    // Get child elements from details arrays
    childElements: computed(() => {
      const children: ElementData[] = []
      tableDataRef.value.forEach((row) => {
        if (row.details?.length) {
          children.push(
            ...row.details.map((child) => ({
              ...child,
              details: child.details || [] // Ensure details is always an array
            }))
          )
        }
      })
      return children
    }) as Ref<ElementData[]>,
    // Get matched elements from details arrays with valid hosts
    matchedElements: computed(() => {
      const matched: ElementData[] = []
      tableDataRef.value.forEach((row) => {
        if (row.details?.length) {
          matched.push(
            ...row.details
              .filter((child) => child.host && child.host !== 'Without Host')
              .map((child) => ({
                ...child,
                details: child.details || [] // Ensure details is always an array
              }))
          )
        }
      })
      return matched
    }) as Ref<ElementData[]>,
    // Get orphaned elements from details arrays with invalid hosts
    orphanedElements: computed(() => {
      const orphaned: ElementData[] = []
      tableDataRef.value.forEach((row) => {
        if (row.details?.length) {
          orphaned.push(
            ...row.details
              .filter((child) => !child.host || child.host === 'Without Host')
              .map((child) => ({
                ...child,
                details: child.details || [] // Ensure details is always an array
              }))
          )
        }
      })
      return orphaned
    }) as Ref<ElementData[]>
  }
}
