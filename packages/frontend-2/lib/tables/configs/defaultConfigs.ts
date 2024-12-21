import type { TableTypeSettings } from '~/composables/core/types'
import { defaultTableConfig } from '~/composables/core/tables/config/defaults'

export const defaultTableTypes: Record<string, TableTypeSettings> = {
  viewer: {
    type: 'viewer',
    availableColumns: [], // This will be populated dynamically from parameter definitions
    defaultColumns: defaultTableConfig.parentColumns,
    categoryFilters: defaultTableConfig.categoryFilters
  },
  schedule: {
    type: 'schedule',
    availableColumns: [], // This will be populated dynamically
    defaultColumns: defaultTableConfig.parentColumns,
    categoryFilters: defaultTableConfig.categoryFilters
  }
}
