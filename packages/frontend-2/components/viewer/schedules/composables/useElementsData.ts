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
  BIMNode
} from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import { debug, DebugCategories } from '../debug/useDebug'
import { useBIMElements } from './useBIMElements'
import { useParameterDiscovery } from './useParameterDiscovery'
import { processDataPipeline } from '../utils/dataPipeline'
import { useStore } from '../core/store'

// Helper to convert ProcessedHeader to UnifiedParameter
function convertToUnifiedParameter(header: ProcessedHeader): UnifiedParameter {
  // Convert ProcessedHeader type to UnifiedParameter type
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

// Convert ViewerTree root to TreeItemComponentModel
function convertWorldTreeRoot(root: ViewerTree['_root']): TreeItemComponentModel {
  const model = root.model
  if (!model?.raw) {
    throw new Error('Invalid world tree root: missing model or raw data')
  }

  const node: BIMNode = {
    raw: model.raw,
    children: model.children?.map((child) => ({
      raw: child.raw!,
      children: child.children?.map((grandChild) => ({
        raw: grandChild.raw!
      }))
    }))
  }

  return {
    id: model.raw.id,
    label: model.raw.type || 'Root',
    rawNode: node,
    children: root.children?.map((child) => ({
      id: child.model?.raw?.id || 'unknown',
      label: child.model?.raw?.type || 'Unknown',
      rawNode: child.model?.raw
        ? {
            raw: child.model.raw,
            children: child.model.children?.map((grandChild) => ({
              raw: grandChild.raw!
            }))
          }
        : undefined
    }))
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

  // Initialize parameter discovery
  const { availableParentHeaders, availableChildHeaders, discoverParameters } =
    useParameterDiscovery({
      selectedParentCategories,
      selectedChildCategories
    })

  // Initialize processing state
  const processingState = ref<ProcessingState>({
    isInitializing: false,
    isProcessingElements: false,
    isUpdatingCategories: false,
    isProcessingFullData: false,
    error: null
  })

  // Create refs for data
  const scheduleDataRef = ref<ElementData[]>([])
  const tableDataRef = ref<TableRow[]>([])

  // Helper to preserve column settings
  const preserveColumnSettings = (
    newColumns: ColumnDef[],
    existingColumns: ColumnDef[]
  ): ColumnDef[] => {
    return newColumns.map((newCol) => ({
      ...newCol,
      ...existingColumns.find((col) => col.field === newCol.field),
      visible: true,
      isFetched: true
    }))
  }

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
        debug?.log(DebugCategories.PARAMETERS, 'Starting parameter discovery', {
          selectedParentCategories: selectedParentCategories.value,
          selectedChildCategories: selectedChildCategories.value,
          worldTreeRoot: {
            hasModel: !!rawWorldTree.value._root.model,
            hasChildren: !!rawWorldTree.value._root.children?.length
          }
        })

        // Convert world tree root to TreeItemComponentModel
        const root = convertWorldTreeRoot(rawWorldTree.value._root)
        await discoverParameters(root)

        debug?.log(DebugCategories.PARAMETERS, 'Raw discovered parameters', {
          parentCount: availableParentHeaders.value.length,
          childCount: availableChildHeaders.value.length,
          parentHeaders: availableParentHeaders.value.map((h) => ({
            field: h.field,
            type: h.type,
            source: h.source,
            category: h.category
          })),
          childHeaders: availableChildHeaders.value.map((h) => ({
            field: h.field,
            type: h.type,
            source: h.source,
            category: h.category
          }))
        })

        // Add custom parameters to available parameters
        const customParams = store.customParameters.value || []
        const discoveredParentParams = [
          ...availableParentHeaders.value,
          ...customParams.map(createCustomParameterHeader)
        ]
        const discoveredChildParams = [
          ...availableChildHeaders.value,
          ...customParams.map(createCustomParameterHeader)
        ]

        debug?.log(DebugCategories.PARAMETERS, 'Parameters with custom ones', {
          parentCount: discoveredParentParams.length,
          childCount: discoveredChildParams.length,
          customCount: customParams.length,
          sampleParent: discoveredParentParams.slice(0, 3).map((p) => ({
            field: p.field,
            type: p.type,
            source: p.source,
            category: p.category
          })),
          sampleChild: discoveredChildParams.slice(0, 3).map((p) => ({
            field: p.field,
            type: p.type,
            source: p.source,
            category: p.category
          }))
        })

        // Convert ProcessedHeaders to UnifiedParameters
        const unifiedParentParams = discoveredParentParams.map(
          convertToUnifiedParameter
        )
        const unifiedChildParams = discoveredChildParams.map(convertToUnifiedParameter)

        debug?.log(DebugCategories.PARAMETERS, 'Converted to UnifiedParameters', {
          parentCount: unifiedParentParams.length,
          childCount: unifiedChildParams.length,
          sampleParent: unifiedParentParams.slice(0, 3).map((p) => ({
            field: p.field,
            type: p.type,
            source: p.source,
            category: p.category
          })),
          sampleChild: unifiedChildParams.slice(0, 3).map((p) => ({
            field: p.field,
            type: p.type,
            source: p.source,
            category: p.category
          }))
        })

        // Update store with available parameters first
        await store.lifecycle.update({
          availableHeaders: {
            parent: unifiedParentParams,
            child: unifiedChildParams
          }
        })

        debug?.log(DebugCategories.PARAMETERS, 'Store updated with parameters', {
          parentParams: unifiedParentParams.length,
          childParams: unifiedChildParams.length,
          customParams: customParams.length,
          storeHeaders: store.availableHeaders.value
        })
      } else {
        debug?.warn(
          DebugCategories.STATE,
          'World tree not available for parameter discovery'
        )
      }

      // Then, process data with ACTIVE parameters
      const result = processDataPipeline({
        allElements: elements,
        selectedParent: selectedParentCategories.value,
        selectedChild: selectedChildCategories.value
      })

      // Get current active columns with preserved settings
      const currentParentColumns = store.parentVisibleColumns.value || []
      const currentChildColumns = store.childVisibleColumns.value || []

      // Create active columns with preserved settings
      const activeParentColumns = preserveColumnSettings(
        result.parentColumns,
        currentParentColumns
      )
      const activeChildColumns = preserveColumnSettings(
        result.childColumns,
        currentChildColumns
      )

      debug?.log(DebugCategories.PARAMETERS, 'Parameters prepared', {
        activeParent: activeParentColumns.length,
        activeChild: activeChildColumns.length,
        sampleActiveParent: activeParentColumns.slice(0, 3).map((p) => ({
          field: p.field,
          type: p.type,
          source: p.source,
          category: p.category
        })),
        sampleActiveChild: activeChildColumns.slice(0, 3).map((p) => ({
          field: p.field,
          type: p.type,
          source: p.source,
          category: p.category
        }))
      })

      // Update store with data and active columns
      await store.lifecycle.update({
        scheduleData: result.filteredElements,
        evaluatedData: result.processedElements,
        tableData: result.tableData,
        // Active parameters (shown in Manage Columns right panel and table)
        parentVisibleColumns: activeParentColumns,
        childVisibleColumns: activeChildColumns,
        // Base columns from data pipeline
        parentBaseColumns: result.parentColumns,
        childBaseColumns: result.childColumns,
        initialized: true
      })

      // Update local refs
      scheduleDataRef.value = result.filteredElements
      tableDataRef.value = result.tableData

      debug?.completeState(DebugCategories.DATA_TRANSFORM, 'Data processing complete', {
        filteredCount: result.filteredElements.length,
        processedCount: result.processedElements.length,
        activeParentCount: activeParentColumns.length,
        activeChildCount: activeChildColumns.length,
        storeState: {
          availableHeaders: store.availableHeaders.value,
          parentVisibleColumns: store.parentVisibleColumns.value?.length,
          childVisibleColumns: store.childVisibleColumns.value?.length
        }
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

  // Watch for category changes
  watch(
    [selectedParentCategories, selectedChildCategories],
    () => allElements.value?.length && updateData(allElements.value),
    { deep: true }
  )

  // Initialize data
  const initializeData = async (): Promise<void> => {
    try {
      debug?.startState(DebugCategories.INITIALIZATION, 'Initializing data')
      processingState.value.isInitializing = true
      await initializeElements()
      debug?.completeState(
        DebugCategories.INITIALIZATION,
        'Data initialization complete'
      )
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
    parentCategories: string[],
    childCategories: string[]
  ): Promise<void> => {
    try {
      debug?.startState(DebugCategories.CATEGORY_UPDATES, 'Updating categories', {
        parent: parentCategories,
        child: childCategories
      })
      processingState.value.isUpdatingCategories = true
      processingState.value.error = null

      if (allElements.value?.length) {
        await updateData(allElements.value)
      }

      debug?.completeState(DebugCategories.CATEGORY_UPDATES, 'Category update complete')
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
      () => bimLoading.value || processingState.value.isProcessingElements
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
