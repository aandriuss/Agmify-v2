import { computed, type ComputedRef } from 'vue'
import type { NamedTableConfig } from '~/composables/useUserSettings'
import { debug, DebugCategories } from '../utils/debug'

interface UseScheduleFlowOptions {
  currentTable: ComputedRef<NamedTableConfig | null>
}

/**
 * Manages the flow of data between different parts of the schedule system,
 * ensuring proper type conversion and state management.
 */
export function useScheduleFlow({ currentTable }: UseScheduleFlowOptions) {
  // Keep the NamedTableConfig type intact
  const tableConfig = computed<NamedTableConfig | null>(() => {
    const table = currentTable.value
    if (!table) {
      debug.log(DebugCategories.STATE, 'No table available')
      return null
    }

    debug.log(DebugCategories.STATE, 'Processing table config', {
      id: table.id,
      name: table.name,
      parentColumnsCount: table.parentColumns.length,
      childColumnsCount: table.childColumns.length
    })

    return table
  })

  return {
    tableConfig
  }
}
