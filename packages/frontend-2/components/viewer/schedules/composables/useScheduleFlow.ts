import { computed, type ComputedRef } from 'vue'
import type { NamedTableConfig } from '~/composables/useUserSettings'
import { debug, DebugCategories } from '../utils/debug'
import {
  defaultColumns,
  defaultDetailColumns,
  defaultTable
} from '../config/defaultColumns'

interface UseScheduleFlowOptions {
  currentTable: ComputedRef<NamedTableConfig | null>
}

/**
 * Manages the flow of data between different parts of the schedule system,
 * ensuring proper type conversion and state management.
 */
export function useScheduleFlow({ currentTable }: UseScheduleFlowOptions) {
  // Keep the NamedTableConfig type intact, use defaults if no table
  const tableConfig = computed<NamedTableConfig>(() => {
    const table = currentTable.value
    if (!table) {
      debug.log(DebugCategories.STATE, 'No table available, using defaults', {
        defaultColumns: defaultColumns.length,
        defaultDetailColumns: defaultDetailColumns.length
      })
      return {
        ...defaultTable,
        id: 'default-table',
        name: 'Default Table'
      }
    }

    debug.log(DebugCategories.STATE, 'Processing table config', {
      id: table.id,
      name: table.name,
      parentColumnsCount: table.parentColumns.length,
      childColumnsCount: table.childColumns.length
    })

    // Ensure required columns are present
    const parentColumns = table.parentColumns.length
      ? table.parentColumns
      : defaultColumns
    const childColumns = table.childColumns.length
      ? table.childColumns
      : defaultDetailColumns

    // Return table with defaults as fallback
    return {
      ...table,
      parentColumns,
      childColumns,
      categoryFilters: table.categoryFilters || defaultTable.categoryFilters,
      customParameters: table.customParameters || []
    }
  })

  return {
    tableConfig
  }
}
