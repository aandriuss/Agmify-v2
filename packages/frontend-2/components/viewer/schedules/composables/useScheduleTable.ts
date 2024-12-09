import { ref, computed, watch } from 'vue'
import type { TableColumnDef } from '../../../core/tables/DataTable/types'
import { TableError } from '../../../core/tables/DataTable/utils'
import { useViewerTable } from '~/composables/tables/useViewerTable'
import type { ScheduleRow } from '../types'

interface UseScheduleTableOptions {
  tableId: string
  initialParentColumns: TableColumnDef[]
  initialChildColumns: TableColumnDef[]
  onError?: (error: TableError) => void
}

export function useScheduleTable(options: UseScheduleTableOptions) {
  // Initialize viewer table
  const viewerTable = useViewerTable(options)

  // Schedule-specific state
  const selectedCategories = ref<string[]>([])
  const filteredRows = ref<ScheduleRow[]>([])
  const parameterGroups = ref<Map<string, ScheduleRow[]>>(new Map())

  // Computed
  const hasSelectedCategories = computed(() => selectedCategories.value.length > 0)
  const availableCategories = computed(() => {
    const categories = new Set<string>()
    viewerTable.expandedRows.value.forEach((row) => {
      const scheduleRow = row as ScheduleRow
      if (scheduleRow.category) {
        categories.add(scheduleRow.category)
      }
    })
    return Array.from(categories).sort()
  })

  // Category Operations
  function updateCategories(categories: string[]): void {
    try {
      selectedCategories.value = [...categories]
      filterRowsByCategories()
    } catch (err) {
      handleError(err)
    }
  }

  function filterRowsByCategories(): void {
    try {
      if (!hasSelectedCategories.value) {
        filteredRows.value = []
        return
      }

      filteredRows.value = viewerTable.expandedRows.value.filter(
        (row): row is ScheduleRow => {
          const scheduleRow = row as ScheduleRow
          return (
            typeof scheduleRow.category === 'string' &&
            selectedCategories.value.includes(scheduleRow.category) &&
            typeof scheduleRow.name === 'string'
          )
        }
      )
    } catch (err) {
      handleError(err)
    }
  }

  // Parameter Group Operations
  function updateParameterGroups(): void {
    try {
      const groups = new Map<string, ScheduleRow[]>()

      filteredRows.value.forEach((row) => {
        if (row.kind) {
          const existingGroup = groups.get(row.kind) || []
          existingGroup.push(row)
          groups.set(row.kind, existingGroup)
        }
      })

      parameterGroups.value = groups
    } catch (err) {
      handleError(err)
    }
  }

  // Watch for changes that affect parameter groups
  watch(filteredRows, () => {
    updateParameterGroups()
  })

  // Error Handler
  function handleError(err: unknown): void {
    const error = err instanceof Error ? err : new Error('An unknown error occurred')
    options.onError?.(new TableError(error.message, err))
  }

  // Reset Operations
  async function reset(): Promise<void> {
    try {
      selectedCategories.value = []
      filteredRows.value = []
      parameterGroups.value = new Map()
      await viewerTable.reset()
    } catch (err) {
      handleError(err)
    }
  }

  return {
    // Base table operations
    ...viewerTable,

    // Schedule-specific state
    selectedCategories,
    filteredRows,
    parameterGroups,
    hasSelectedCategories,
    availableCategories,

    // Schedule-specific operations
    updateCategories,
    filterRowsByCategories,
    updateParameterGroups,

    // Reset operations
    reset
  }
}
