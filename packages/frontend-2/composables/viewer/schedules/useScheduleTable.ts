import { computed, watch, ref } from 'vue'
import { TableStateError } from '~/composables/core/types/errors'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useTableInitialization } from '~/composables/core/tables/initialization/useTableInitialization'
import { useCategoryTableState } from '~/composables/core/tables/state/useCategoryTableState'
import { useParameterGroups } from '~/composables/core/parameters/useParameterGroups'
import type { ScheduleRow } from '~/composables/core/types/schedules/schedule-types'
import { selectedParameterToScheduleRow } from '~/composables/core/types/schedules/schedule-types'
import {
  type SelectedParameter,
  createAvailableBimParameter,
  createSelectedParameter
} from '~/composables/core/types/parameters/parameter-states'
import type { TableStore } from '~/composables/core/tables/store/types'
import { useStore } from '~/composables/core/store'
import {
  toViewerTableRow,
  createElementData,
  type ElementData
} from '~/composables/core/types/elements/elements-base'
import type { TableColumn } from '~/composables/core/types'
import type { TableRow } from '~/composables/core/types/data/data-core'
import type { ParameterValue } from '~/composables/core/types/parameters'

interface UseScheduleTableOptions {
  tableId: string
  initialParentColumns: TableColumn[]
  initialChildColumns: TableColumn[]
  onError?: (error: Error) => void
}

/**
 * Schedule-specific table state management
 * Combines viewer table state with category and parameter group functionality
 */
export function useScheduleTable(options: UseScheduleTableOptions) {
  const coreStore = useStore()
  const store = coreStore as unknown as TableStore

  // Initialize core states
  const { initComponent: tableInit } = useTableInitialization({
    store,
    initialState: {
      selectedTableId: options.tableId,
      tableName: '',
      currentTableColumns: options.initialParentColumns,
      currentDetailColumns: options.initialChildColumns,
      selectedParentCategories: [],
      selectedChildCategories: []
    },
    onError: handleError
  })

  const categoryState = useCategoryTableState({ onError: handleError })

  // Row expansion state
  const expandedRows = ref<ScheduleRow[]>([])

  // Convert viewer rows to parameters
  const parameters = computed<SelectedParameter[]>(() => {
    return (coreStore.tableData.value || []).flatMap((row: TableRow) => {
      // Convert to ElementData first
      const elementData = createElementData({
        id: typeof row.id === 'string' ? row.id : String(row.id),
        type: typeof row.type === 'string' ? row.type : 'unknown',
        parameters:
          typeof row.parameters === 'object' && row.parameters
            ? (row.parameters as Record<string, ParameterValue>)
            : {},
        name: typeof row.name === 'string' ? row.name : String(row.name || ''),
        field: typeof row.field === 'string' ? row.field : String(row.field || ''),
        header: typeof row.header === 'string' ? row.header : String(row.header || ''),
        removable: typeof row.removable === 'boolean' ? row.removable : true,
        category: typeof row.category === 'string' ? row.category : undefined,
        metadata:
          typeof row.metadata === 'object' && row.metadata !== null
            ? (row.metadata as Record<string, unknown>)
            : undefined,
        order: typeof row.order === 'number' ? row.order : 0,
        visible: typeof row.visible === 'boolean' ? row.visible : true
      } as ElementData)

      // Convert to ViewerTableRow
      const viewerRow = toViewerTableRow(elementData)
      const params: SelectedParameter[] = []

      if (viewerRow.parameters) {
        Object.entries(viewerRow.parameters).forEach(([key, value], index) => {
          // Skip system parameters
          if (key.startsWith('__')) return

          // Create raw parameter
          const raw = {
            id: key,
            name: key.split('.').pop() || key,
            value,
            sourceGroup: key.split('.')[0] || 'Parameters',
            metadata: {
              category: viewerRow.category,
              fullKey: key,
              isSystem: false,
              group: key.split('.')[0] || 'Parameters',
              elementId: viewerRow.id
            }
          }

          // Create BIM parameter
          const bimParam = createAvailableBimParameter(
            raw,
            typeof value === 'number' ? 'number' : 'string',
            value,
            false
          )

          // Convert to selected parameter
          params.push(createSelectedParameter(bimParam, index, true))
        })
      }

      return params
    })
  })

  // Convert to schedule rows for display
  const scheduleRows = computed<ScheduleRow[]>(() => {
    return parameters.value.map(selectedParameterToScheduleRow)
  })

  // Parameter groups state
  const parameterState = useParameterGroups({
    parameters: computed(() => parameters.value.filter((p) => p.kind === 'user')),
    onError: (message) => handleError(new Error(message))
  })

  // Computed properties
  const availableCategories = computed(() => {
    return categoryState.getAvailableCategories(scheduleRows.value)
  })

  // For backward compatibility with ScheduleTable.vue
  const parameterGroups = computed(() => {
    const groups = new Map<string, ScheduleRow[]>()
    const rows = categoryState.hasSelectedCategories.value
      ? categoryState.filteredRows.value
      : scheduleRows.value

    rows.forEach((row) => {
      const param = parameters.value.find((p) => p.id === row.id)
      if (param) {
        const scheduleRow = selectedParameterToScheduleRow(param)
        if (scheduleRow.kind) {
          const existingGroup = groups.get(scheduleRow.kind) || []
          existingGroup.push(scheduleRow)
          groups.set(scheduleRow.kind, existingGroup)
        }
      }
    })
    return groups
  })

  // Row expansion handlers
  function expandRow(row: ScheduleRow): void {
    if (!expandedRows.value.find((r) => r.id === row.id)) {
      expandedRows.value.push(row)
    }
  }

  function collapseRow(row: ScheduleRow): void {
    const index = expandedRows.value.findIndex((r) => r.id === row.id)
    if (index !== -1) {
      expandedRows.value.splice(index, 1)
    }
  }

  // Watch for changes that affect filtering and grouping
  watch(scheduleRows, (rows) => {
    categoryState.filterRowsByCategories(rows)
  })

  // Error handling
  function handleError(err: unknown): void {
    const error =
      err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Schedule table error')
    options.onError?.(error)
    debug.error(DebugCategories.ERROR, 'Schedule table error:', err)
  }

  // Reset operations
  async function reset(): Promise<void> {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Resetting schedule table')

      categoryState.reset()
      await tableInit.reset()
      expandedRows.value = []

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Schedule table reset')
    } catch (err) {
      handleError(err)
    }
  }

  // Initialize
  async function initialize(): Promise<void> {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Initializing schedule table')

      await tableInit.initialize()

      debug.completeState(DebugCategories.INITIALIZATION, 'Schedule table initialized')
    } catch (err) {
      handleError(err)
    }
  }

  return {
    // Base table state
    tableInit,
    store,

    // Schedule-specific state
    scheduleRows,
    expandedRows,

    // Row expansion handlers
    expandRow,
    collapseRow,

    // Category state
    selectedCategories: categoryState.selectedCategories,
    filteredRows: categoryState.filteredRows,
    hasSelectedCategories: categoryState.hasSelectedCategories,
    availableCategories,
    updateCategories: categoryState.updateCategories,

    // Parameter groups state
    groupedParameters: parameterState.groupedParameters,
    uniqueGroups: parameterState.uniqueGroups,
    parameterGroups, // For backward compatibility

    // Operations
    initialize,
    reset
  }
}
