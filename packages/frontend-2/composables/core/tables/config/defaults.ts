import type { AvailableBimParameter } from '../../types/parameters/parameter-states'
import type { TableSettings } from '../store/types'
import { createTableColumn } from '~/composables/core/types/tables/table-column'

/**
 * Essential parameters that should always be available
 */
export const essentialBimParameters: Record<string, AvailableBimParameter> = {
  id: {
    kind: 'bim',
    id: 'id',
    name: 'id',
    type: 'string',
    value: null,
    group: {
      fetchedGroup: 'Identity Data',
      currentGroup: 'Identity Data'
    },
    visible: true,
    isSystem: true,
    metadata: {
      displayName: 'id',
      isSystem: true
    }
  },
  Mark: {
    kind: 'bim',
    id: 'Mark',
    name: 'Mark',
    type: 'string',
    value: null,
    group: {
      fetchedGroup: 'Identity Data',
      currentGroup: 'Identity Data'
    },
    visible: true,
    isSystem: true,
    metadata: {
      displayName: 'Mark',
      isSystem: true
    }
  },
  Category: {
    kind: 'bim',
    id: 'Category',
    name: 'Category',
    type: 'string',
    value: null,
    group: {
      fetchedGroup: 'Identity Data',
      currentGroup: 'Identity Data'
    },
    visible: true,
    isSystem: true,
    metadata: {
      displayName: 'Category',
      isSystem: true
    }
  },
  Host: {
    kind: 'bim',
    id: 'Host',
    name: 'Host',
    type: 'string',
    value: null,
    group: {
      fetchedGroup: 'Parameters',
      currentGroup: 'Parameters'
    },
    visible: true,
    isSystem: true,
    metadata: {
      displayName: 'Host',
      isSystem: true
    }
  }
}

// Create parent columns with full parameter data
const parentColumns = [
  createTableColumn(essentialBimParameters.id, 0),
  createTableColumn(essentialBimParameters.Mark, 1),
  createTableColumn(essentialBimParameters.Category, 2)
]

// Create child columns with full parameter data
const childColumns = [
  createTableColumn(essentialBimParameters.id, 0),
  createTableColumn(essentialBimParameters.Mark, 1),
  createTableColumn(essentialBimParameters.Host, 2),
  createTableColumn(essentialBimParameters.Category, 3)
]

/**
 * Default table configuration with essential columns
 * Matches GraphQL TableSettings type exactly
 */
export const defaultTableConfig: TableSettings = {
  id: 'default-table',
  name: 'Default Table',
  displayName: 'Default Table',
  categoryFilters: {
    selectedParentCategories: [],
    selectedChildCategories: []
  },
  parentColumns,
  childColumns,
  metadata: {}, // Empty object, not undefined
  filters: [], // Empty array, not undefined
  sort: {
    field: undefined,
    order: undefined
  },
  lastUpdateTimestamp: Date.now()
}

/**
 * Create a new table configuration
 * Ensures all required fields are present and properly initialized
 */
export function createNewTableConfig(id: string, name: string): TableSettings {
  return {
    id,
    name,
    displayName: name,
    categoryFilters: {
      selectedParentCategories: [],
      selectedChildCategories: []
    },
    parentColumns: [...parentColumns], // Use default parent columns
    childColumns: [...childColumns], // Use default child columns
    metadata: {}, // Empty object, not undefined
    filters: [], // Empty array, not undefined
    sort: {
      field: undefined,
      order: undefined
    },
    lastUpdateTimestamp: Date.now()
  }
}
