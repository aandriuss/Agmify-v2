import { computed, watch } from 'vue'
import { TableStateError } from '~/composables/core/types/errors'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useViewerTableState } from '~/composables/core/tables'
import { useCategoryTableState } from '~/composables/core/tables/state/useCategoryTableState'
import { useParameterGroups } from '~/composables/core/parameters/useParameterGroups'
import type { CategoryTableRow } from '~/composables/core/types/tables/category-types'
import type { ViewerTableRow } from '~/composables/core/types/elements'
import type { ColumnDef, UserParameter, UserValueType } from '~/composables/core/types'

/**
 * Schedule row interface combining viewer and category functionality
 */
export interface ScheduleRow
  extends ViewerTableRow,
    Omit<CategoryTableRow, keyof ViewerTableRow> {
  kind?: string
}

interface UseScheduleTableOptions {
  tableId: string
  initialParentColumns: ColumnDef[]
  initialChildColumns: ColumnDef[]
  onError?: (error: Error) => void
}

/**
 * Schedule-specific table state management
 * Combines viewer table state with category and parameter group functionality
 */
export function useScheduleTable(options: UseScheduleTableOptions) {
  // Initialize core states
  const viewerState = useViewerTableState({
    tableId: options.tableId,
    initialColumns: options.initialParentColumns,
    initialState: {
      expandedRows: [],
      detailColumns: options.initialChildColumns
    },
    onError: handleError
  })

  const categoryState = useCategoryTableState({ onError: handleError })

  // Convert viewer rows to schedule rows
  const scheduleRows = computed<ScheduleRow[]>(() => {
    return viewerState.rows.value.map((row) => ({
      ...row,
      category: (row as ScheduleRow).category,
      kind: (row as ScheduleRow).kind
    }))
  })

  // Convert rows to parameters for parameter groups
  const parameters = computed<UserParameter[]>(() => {
    return categoryState.filteredRows.value.map((row) => ({
      id: row.id,
      kind: 'user' as const,
      name: row.name,
      field: row.id,
      type: 'text' as UserValueType,
      header: row.name,
      visible: true,
      removable: true,
      value: null,
      group: (row as ScheduleRow).kind || 'Custom'
    }))
  })

  const parameterState = useParameterGroups({
    parameters,
    onError: (message) => handleError(new Error(message))
  })

  // Computed properties
  const availableCategories = computed(() => {
    return categoryState.getAvailableCategories(scheduleRows.value)
  })

  // For backward compatibility with ScheduleTable.vue
  const parameterGroups = computed(() => {
    const groups = new Map<string, ScheduleRow[]>()
    categoryState.filteredRows.value.forEach((row) => {
      const scheduleRow = row as ScheduleRow
      if (scheduleRow.kind) {
        const existingGroup = groups.get(scheduleRow.kind) || []
        existingGroup.push(scheduleRow)
        groups.set(scheduleRow.kind, existingGroup)
      }
    })
    return groups
  })

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
      await viewerState.initializeElements()

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Schedule table reset')
    } catch (err) {
      handleError(err)
    }
  }

  return {
    // Base table state
    ...viewerState,

    // Schedule-specific state
    scheduleRows,

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

    // Reset operations
    reset
  }
}
