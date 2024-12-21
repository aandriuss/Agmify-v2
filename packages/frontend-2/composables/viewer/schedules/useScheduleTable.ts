import { computed, watch, ref } from 'vue'
import {
  TableStateError,
  createUserParameterWithDefaults
} from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useTableInitialization } from '~/composables/core/tables/initialization/useTableInitialization'
import { useCategoryTableState } from '~/composables/core/tables/state/useCategoryTableState'
import { useParameterGroups } from '~/composables/core/parameters/useParameterGroups'
import { useBIMParameters } from '~/composables/viewer/parameters/useBIMParameters'
import {
  toTableParameter,
  toTableParameters,
  isTableUserParameter
} from '~/composables/core/types/tables/parameter-table-types'
import { scheduleRowToCategoryRow } from '~/composables/core/types/tables/schedule-types'
import type {
  ViewerTableRow,
  TableColumn,
  UserParameter,
  TableParameter,
  ScheduleRow,
  Parameter
} from '~/composables/core/types'
import { useStore } from '~/composables/core/store'

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
  const store = useStore()
  const { extractBIMParameter } = useBIMParameters()

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
  const parameters = computed<Parameter[]>(() => {
    return (store.tableData.value || []).map((row): Parameter => {
      const viewerRow = row as ViewerTableRow
      // Try to extract as BIM parameter first
      const bimParam = extractBIMParameter(viewerRow, viewerRow.name)
      if (bimParam) return bimParam

      // Fall back to user parameter
      return createUserParameterWithDefaults({
        id: viewerRow.id,
        name: viewerRow.name,
        field: viewerRow.field,
        type: 'fixed',
        header: viewerRow.header,
        visible: viewerRow.visible,
        removable: viewerRow.removable,
        order: viewerRow.order,
        group: String(viewerRow.metadata?.kind || 'Custom'),
        metadata: viewerRow.metadata
      })
    })
  })

  // Convert parameters to table parameters
  const tableParameters = computed<TableParameter[]>(() => {
    return toTableParameters(parameters.value)
  })

  // Filter user parameters for parameter groups
  const userParameters = computed<UserParameter[]>(() => {
    return tableParameters.value.filter(isTableUserParameter).map(
      (p): UserParameter => ({
        id: p.id,
        kind: 'user',
        name: p.name,
        field: p.field,
        type: p.type,
        header: p.header,
        visible: p.visible,
        removable: p.removable,
        order: p.order,
        value: p.value,
        group: p.group,
        metadata: p.metadata
      })
    )
  })

  // Convert to schedule rows for display
  const scheduleRows = computed<ScheduleRow[]>(() => {
    return tableParameters.value.map(
      (param): ScheduleRow => ({
        id: param.id,
        name: param.name,
        type: param.type,
        field: param.field,
        header: param.header,
        visible: param.visible,
        removable: param.removable,
        order: param.order,
        category: param.category,
        kind: param.kind,
        parameters: {},
        selected: false,
        metadata: param.metadata
      })
    )
  })

  // Parameter groups state
  const parameterState = useParameterGroups({
    parameters: userParameters,
    onError: (message) => handleError(new Error(message))
  })

  // Computed properties
  const availableCategories = computed(() => {
    return categoryState.getAvailableCategories(
      scheduleRows.value.map(scheduleRowToCategoryRow)
    )
  })

  // For backward compatibility with ScheduleTable.vue
  const parameterGroups = computed(() => {
    const groups = new Map<string, ScheduleRow[]>()
    categoryState.filteredRows.value.forEach((row) => {
      const param = toTableParameter(
        parameters.value.find((p) => p.id === row.id) ||
          createUserParameterWithDefaults({
            field: row.id,
            name: row.name,
            type: 'fixed',
            group: 'Custom'
          })
      )
      const scheduleRow = {
        id: param.id,
        name: param.name,
        type: param.type,
        field: param.field,
        header: param.header,
        visible: param.visible,
        removable: param.removable,
        order: param.order,
        category: param.category,
        kind: param.kind,
        parameters: {},
        selected: false,
        metadata: param.metadata
      }
      if (scheduleRow.kind) {
        const existingGroup = groups.get(scheduleRow.kind) || []
        existingGroup.push(scheduleRow)
        groups.set(scheduleRow.kind, existingGroup)
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
    categoryState.filterRowsByCategories(rows.map(scheduleRowToCategoryRow))
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
      await store.lifecycle.init()

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
