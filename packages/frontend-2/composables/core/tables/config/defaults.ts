import type { ColumnDef, NamedTableConfig } from '../../types'
import { createBimColumnDefWithDefaults } from '../../types/tables/column-types'

// Common columns that should appear in both parent and child tables
const commonColumns: ColumnDef[] = [
  createBimColumnDefWithDefaults({
    field: 'mark',
    header: 'Mark',
    type: 'string',
    order: 0,
    visible: true,
    removable: false, // Mark column should not be removable since it's used for identification
    isFixed: true,
    description: 'Element mark identifier',
    source: 'Parameters',
    fetchedGroup: 'Parameters',
    currentGroup: 'Parameters'
  }),
  createBimColumnDefWithDefaults({
    field: 'category',
    header: 'Category',
    type: 'string',
    order: 1,
    visible: true,
    removable: true,
    isFixed: false,
    description: 'Element category',
    source: 'Parameters',
    fetchedGroup: 'Parameters',
    currentGroup: 'Parameters'
  })
]

export const defaultColumns: ColumnDef[] = [
  ...commonColumns,
  createBimColumnDefWithDefaults({
    field: 'width',
    header: 'Width',
    type: 'number',
    category: 'dimensions',
    description: 'Element width',
    visible: true,
    order: 4,
    removable: true,
    source: 'Parameters',
    fetchedGroup: 'Parameters',
    currentGroup: 'Parameters'
  }),
  createBimColumnDefWithDefaults({
    field: 'height',
    header: 'Height',
    type: 'number',
    category: 'dimensions',
    description: 'Element height',
    visible: true,
    order: 5,
    removable: true,
    source: 'Parameters',
    fetchedGroup: 'Parameters',
    currentGroup: 'Parameters'
  }),
  createBimColumnDefWithDefaults({
    field: 'family',
    header: 'Family',
    type: 'string',
    category: 'other',
    description: 'Element family',
    visible: true,
    order: 6,
    removable: true,
    source: 'Parameters',
    fetchedGroup: 'Parameters',
    currentGroup: 'Parameters'
  }),
  createBimColumnDefWithDefaults({
    field: 'length',
    header: 'Length',
    type: 'number',
    category: 'dimensions',
    description: 'Element length',
    visible: true,
    order: 7,
    removable: true,
    source: 'Parameters',
    fetchedGroup: 'Parameters',
    currentGroup: 'Parameters'
  })
]

export const defaultDetailColumns: ColumnDef[] = [
  ...commonColumns,
  createBimColumnDefWithDefaults({
    field: 'width',
    header: 'Width',
    type: 'string',
    order: 3,
    visible: true,
    removable: true,
    isFixed: false,
    description: 'Element width',
    source: 'Parameters',
    fetchedGroup: 'Parameters',
    currentGroup: 'Parameters'
  }),
  createBimColumnDefWithDefaults({
    field: 'host',
    header: 'Host',
    type: 'string',
    order: 2,
    visible: true,
    removable: true,
    isFixed: false,
    description: 'Host element mark',
    source: 'Parameters',
    fetchedGroup: 'Parameters',
    currentGroup: 'Parameters'
  })
]

export const defaultTableConfig: NamedTableConfig = {
  id: 'default-table',
  name: 'Default Table',
  displayName: 'Default Table',
  parentColumns: defaultColumns,
  childColumns: defaultDetailColumns,
  categoryFilters: {
    selectedParentCategories: [],
    selectedChildCategories: []
  },
  userParameters: [],
  selectedParameterIds: [],
  lastUpdateTimestamp: Date.now()
}

/**
 * Ensure required columns are present in table configuration
 */
export function ensureRequiredColumns(config: NamedTableConfig): NamedTableConfig {
  const parentColumns = config.parentColumns.length
    ? config.parentColumns
    : defaultColumns
  const childColumns = config.childColumns.length
    ? config.childColumns
    : defaultDetailColumns

  return {
    ...config,
    parentColumns,
    childColumns,
    categoryFilters: config.categoryFilters || defaultTableConfig.categoryFilters,
    userParameters: config.userParameters || [],
    selectedParameterIds: config.selectedParameterIds || [],
    lastUpdateTimestamp: config.lastUpdateTimestamp || Date.now()
  }
}
