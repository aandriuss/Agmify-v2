import { ref, computed, watch } from 'vue'
import type {
  ElementData,
  ProcessingState,
  TableRow,
  ElementsDataReturn,
  ViewerTree,
  TreeItemComponentModel,
  ProcessedHeader,
  ParameterValueType,
  UnifiedParameter,
  ParameterType,
  BIMNode,
  NodeModel
} from '~/composables/core/types'
import { debug, DebugCategories } from '../debug/useDebug'
import { useBIMElements } from './useBIMElements'
import { useParameterDiscovery } from './useParameterDiscovery'
import { processDataPipeline } from '../utils/dataPipeline'
import { useStore } from '../core/store'
import { mergeColumns } from '../utils/columnUtils'

// Helper to convert ProcessedHeader to UnifiedParameter
function convertToUnifiedParameter(header: ProcessedHeader): UnifiedParameter {
  let paramType: ParameterType
  switch (header.type) {
    case 'number':
      paramType = 'equation'
      break
    case 'boolean':
      paramType = 'fixed'
      break
    default:
      paramType = 'fixed'
  }

  const param: UnifiedParameter = {
    id: header.field,
    name: header.header,
    field: header.field,
    header: header.header,
    type: paramType,
    category: header.category,
    description: header.description,
    source: header.source,
    isFetched: header.isFetched,
    fetchedGroup: header.fetchedGroup,
    currentGroup: header.currentGroup,
    visible: true,
    removable: true
  }

  debug.log(
    DebugCategories.PARAMETERS,
    'Converting ProcessedHeader to UnifiedParameter',
    {
      from: {
        field: header.field,
        type: header.type,
        source: header.source,
        category: header.category
      },
      to: {
        field: param.field,
        type: param.type,
        source: param.source,
        category: param.category
      }
    }
  )

  return param
}

// Convert NodeModel to TreeItemComponentModel
function convertNodeModelToTreeItem(model: NodeModel): TreeItemComponentModel | null {
  if (!model.raw) return null

  const bimNode: BIMNode = { raw: model.raw }
  const children: TreeItemComponentModel[] = []

  if (model.children?.length) {
    model.children.forEach((child) => {
      const childItem = convertNodeModelToTreeItem(child)
      if (childItem) {
        children.push(childItem)
      }
    })
  }

  if (children.length > 0) {
    bimNode.children = children.map((child) => ({
      raw: child.rawNode!.raw,
      children: child.rawNode!.children
    }))
  }

  return {
    id: model.raw.id,
    label: model.raw.type || 'Unknown',
    rawNode: bimNode,
    children: children.length > 0 ? children : undefined
  }
}

export function useElementsData({
  selectedParentCategories,
  selectedChildCategories
}: {
  selectedParentCategories: Ref<string[]>
  selectedChildCategories: Ref<string[]>
}): ElementsDataReturn {
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

  const { availableParentHeaders, availableChildHeaders, discoverParameters } =
    useParameterDiscovery({
      selectedParentCategories,
      selectedChildCategories
    })

  const processingState = ref<ProcessingState>({
    isInitializing: false,
    isProcessingElements: false,
    isUpdatingCategories: false,
    isProcessingFullData: false,
    error: null
  })

  const scheduleDataRef = ref<ElementData[]>([])
  const tableDataRef = ref<TableRow[]>([])

  // Helper to create ProcessedHeader for custom parameter
  const createCustomParameterHeader = (param: {
    id: string
    name: string
    type: 'equation' | 'fixed'
    equation?: string
    value?: string
  }): ProcessedHeader => {
    const paramType: ParameterValueType =
      param.type === 'equation' ? 'number' : 'string'
    return {
      field: `param_${param.id}`,
      header: param.name,
      type: paramType,
      source: 'Custom Parameters',
      isFetched: true,
      category: 'Custom Parameters',
      description:
        param.type === 'equation'
          ? `Custom equation parameter: ${param.equation}`
          : `Custom fixed parameter: ${param.value}`,
      fetchedGroup: 'Custom Parameters',
      currentGroup: 'Custom Parameters'
    }
  }

  // Update data when source data or categories change
  const updateData = async (elements: ElementData[]) => {
    try {
      if (!elements?.length) {
        debug?.warn(DebugCategories.DATA, 'No elements available for processing')
        scheduleDataRef.value = []
        tableDataRef.value = []
        return
      }

      debug?.startState(DebugCategories.DATA_TRANSFORM, 'Processing data', {
        elementCount: elements.length,
        selectedParent: selectedParentCategories.value,
        selectedChild: selectedChildCategories.value
      })
      processingState.value.isProcessingElements = true

      // First, discover ALL available parameters
      if (rawWorldTree.value?._root) {
        const model = rawWorldTree.value._root.model
        if (!model?.raw) {
          throw new Error('Invalid world tree root: missing model or raw data')
        }

        const root = convertNodeModelToTreeItem(model)
        if (!root) {
          throw new Error('Failed to convert root model')
        }

        // Process additional children
        if (rawWorldTree.value._root.children?.length) {
          const additionalChildren: TreeItemComponentModel[] = []
          rawWorldTree.value._root.children.forEach((child) => {
            if (child.model) {
              const childItem = convertNodeModelToTreeItem(child.model)
              if (childItem) {
                additionalChildren.push(childItem)
                if (root.rawNode) {
                  root.rawNode.children = root.rawNode.children || []
                  root.rawNode.children.push({
                    raw: childItem.rawNode!.raw,
                    children: childItem.rawNode!.children
                  })
                }
              }
            }
          })

          if (additionalChildren.length > 0) {
            root.children = [...(root.children || []), ...additionalChildren]
          }
        }

        await discoverParameters(root)

        // Add custom parameters
        const customParams = store.customParameters.value || []
        const discoveredParentParams = [
          ...availableParentHeaders.value,
          ...customParams.map(createCustomParameterHeader)
        ]
        const discoveredChildParams = [
          ...availableChildHeaders.value,
          ...customParams.map(createCustomParameterHeader)
        ]

        // Convert to UnifiedParameters
        const unifiedParentParams = discoveredParentParams.map(
          convertToUnifiedParameter
        )
        const unifiedChildParams = discoveredChildParams.map(convertToUnifiedParameter)

        // Update store with available parameters
        await store.lifecycle.update({
          availableHeaders: {
            parent: unifiedParentParams,
            child: unifiedChildParams
          }
        })
      }

      // Process data with progressive loading
      const result = await processDataPipeline({
        allElements: elements,
        selectedParent: selectedParentCategories.value,
        selectedChild: selectedChildCategories.value
      })

      // Get current columns
      const currentParentColumns = store.parentVisibleColumns.value || []
      const currentChildColumns = store.childVisibleColumns.value || []

      // Merge columns with current settings
      const activeParentColumns = mergeColumns(
        result.parentColumns,
        currentParentColumns
      )
      const activeChildColumns = mergeColumns(result.childColumns, currentChildColumns)

      // Update store with processed data
      await store.lifecycle.update({
        scheduleData: result.filteredElements,
        evaluatedData: result.processedElements,
        tableData: result.tableData,
        parentVisibleColumns: activeParentColumns,
        childVisibleColumns: activeChildColumns,
        parentBaseColumns: result.parentColumns,
        childBaseColumns: result.childColumns,
        initialized: true
      })

      // Update local refs
      scheduleDataRef.value = result.filteredElements
      tableDataRef.value = result.tableData

      // Update processing state based on pipeline result
      processingState.value.isProcessingFullData = result.isProcessingComplete

      debug?.completeState(DebugCategories.DATA_TRANSFORM, 'Data processing complete', {
        filteredCount: result.filteredElements.length,
        processedCount: result.processedElements.length,
        isComplete: result.isProcessingComplete
      })
    } catch (error) {
      debug?.error(DebugCategories.ERROR, 'Error processing data:', error)
      processingState.value.error =
        error instanceof Error ? error : new Error(String(error))
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
      debug?.startState(DebugCategories.INITIALIZATION, 'Initializing data')
      processingState.value.isInitializing = true
      await initializeElements()
    } catch (error) {
      debug?.error(DebugCategories.ERROR, 'Error initializing data:', error)
      processingState.value.error =
        error instanceof Error ? error : new Error('Failed to initialize data')
      throw error
    } finally {
      processingState.value.isInitializing = false
    }
  }

  // Category update handler
  const updateCategories = async (
    _parentCategories: string[],
    _childCategories: string[]
  ): Promise<void> => {
    try {
      debug?.startState(DebugCategories.CATEGORY_UPDATES, 'Updating categories')
      processingState.value.isUpdatingCategories = true
      processingState.value.error = null

      if (allElements.value?.length) {
        await updateData(allElements.value)
      }
    } catch (error) {
      debug?.error(DebugCategories.ERROR, 'Error updating categories:', error)
      processingState.value.error =
        error instanceof Error ? error : new Error('Failed to update categories')
      throw error
    } finally {
      processingState.value.isUpdatingCategories = false
    }
  }

  // Computed properties for elements
  const parentElements = computed(() =>
    tableDataRef.value
      .filter(
        (row): row is TableRow & { details: TableRow[] } =>
          !row.isChild && Array.isArray(row.details)
      )
      .map(
        (row): ElementData => ({
          ...row,
          details: row.details.map(
            (child): ElementData => ({
              ...child,
              details: []
            })
          )
        })
      )
  ) as Ref<ElementData[]>

  const childElements = computed(() => {
    const children: ElementData[] = []
    tableDataRef.value.forEach((row) => {
      if (Array.isArray(row.details) && row.details.length > 0) {
        children.push(
          ...row.details.map(
            (child): ElementData => ({
              ...child,
              details: []
            })
          )
        )
      }
    })
    return children
  }) as Ref<ElementData[]>

  const matchedElements = computed(() =>
    childElements.value.filter((child) => child.host && child.host !== 'Without Host')
  ) as Ref<ElementData[]>

  const orphanedElements = computed(() =>
    childElements.value.filter((child) => !child.host || child.host === 'Without Host')
  ) as Ref<ElementData[]>

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
      () =>
        bimLoading.value ||
        processingState.value.isProcessingElements ||
        !processingState.value.isProcessingFullData
    ),
    hasError: computed(() => bimError.value || !!processingState.value.error),
    processingState,
    rawWorldTree: rawWorldTree as Ref<ViewerTree | null>,
    rawTreeNodes,
    rawElements: allElements,
    parentElements,
    childElements,
    matchedElements,
    orphanedElements
  }
}
