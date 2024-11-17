import type { NamedTableConfig } from '~/composables/settings/types/scheduleTypes'
import type { TableConfig } from '../types/tableConfig'

/**
 * Convert NamedTableConfig to TableConfig
 */
export function toTableConfig(config: NamedTableConfig | null): TableConfig | null {
  if (!config) return null

  return {
    name: config.name,
    parentColumns: config.parentColumns,
    childColumns: config.childColumns
  }
}

/**
 * Convert TableConfig to NamedTableConfig
 */
export function toNamedTableConfig(
  config: TableConfig,
  id: string,
  categoryFilters: {
    selectedParentCategories: string[]
    selectedChildCategories: string[]
  }
): NamedTableConfig {
  return {
    id,
    name: config.name,
    parentColumns: config.parentColumns,
    childColumns: config.childColumns,
    categoryFilters,
    lastUpdateTimestamp: Date.now()
  }
}

/**
 * Create an empty TableConfig
 */
export function createEmptyTableConfig(): TableConfig {
  return {
    name: '',
    parentColumns: [],
    childColumns: []
  }
}
