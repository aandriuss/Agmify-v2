/**
 * Table Configuration Conversion Utilities
 *
 * This module provides utilities for converting between different table configuration formats:
 * - TableConfig: Base configuration used by the core system
 * - TableSettings: Extended configuration with display properties
 *
 * The conversion handles:
 * - Basic table properties (name, columns, etc.)
 * - Category filters
 * - Selected parameters (both BIM and user parameters)
 */

import type { TableConfig, TableSettings } from '~/composables/core/types'
/**
 * Convert a partial TableConfig to a complete TableSettings
 */
export function toNamedTableConfig(
  config: Partial<TableConfig>,
  id: string
): TableSettings {
  const timestamp = Date.now()

  return {
    id,
    name: config.name || '',
    displayName: config.name || '',
    parentColumns: config.parentColumns || [],
    childColumns: config.childColumns || [],
    categoryFilters: {
      selectedParentCategories: config.categoryFilters?.selectedParentCategories || [],
      selectedChildCategories: config.categoryFilters?.selectedChildCategories || []
    },
    selectedParameters: config.selectedParameters || {
      parent: [],
      child: []
    },
    lastUpdateTimestamp: timestamp
  }
}

/**
 * Convert a TableSettings back to a TableConfig
 */
export function toTableConfig(namedConfig: TableSettings): TableConfig {
  return {
    id: namedConfig.id,
    name: namedConfig.name,
    parentColumns: namedConfig.parentColumns,
    childColumns: namedConfig.childColumns,
    categoryFilters: namedConfig.categoryFilters,
    selectedParameters: namedConfig.selectedParameters,
    lastUpdateTimestamp: namedConfig.lastUpdateTimestamp
  }
}
