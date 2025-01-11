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
    name: 'ID',
    type: 'string',
    value: null,
    fetchedGroup: 'Identity Data',
    currentGroup: 'Identity Data',
    visible: true,
    isSystem: true,
    metadata: {
      displayName: 'ID',
      originalGroup: 'Identity Data',
      groupId: 'bim_Identity Data',
      isSystem: true
    }
  },
  mark: {
    kind: 'bim',
    id: 'mark',
    name: 'Mark',
    type: 'string',
    value: null,
    fetchedGroup: 'Identity Data',
    currentGroup: 'Identity Data',
    visible: true,
    isSystem: true,
    metadata: {
      displayName: 'Mark',
      originalGroup: 'Identity Data',
      groupId: 'bim_Identity Data',
      isSystem: true
    }
  },
  category: {
    kind: 'bim',
    id: 'category',
    name: 'Category',
    type: 'string',
    value: null,
    fetchedGroup: 'Identity Data',
    currentGroup: 'Identity Data',
    visible: true,
    isSystem: true,
    metadata: {
      displayName: 'Category',
      originalGroup: 'Identity Data',
      groupId: 'bim_Identity Data',
      isSystem: true
    }
  },
  host: {
    kind: 'bim',
    id: 'host',
    name: 'Host',
    type: 'string',
    value: null,
    fetchedGroup: 'Parameters',
    currentGroup: 'Parameters',
    visible: true,
    isSystem: true,
    metadata: {
      displayName: 'Host',
      originalGroup: 'Parameters',
      groupId: 'bim_Parameters',
      isSystem: true
    }
  }
}

// Create parent columns with full parameter data
const parentColumns = [
  createTableColumn(essentialBimParameters.id, 0),
  createTableColumn(essentialBimParameters.mark, 1),
  createTableColumn(essentialBimParameters.category, 2)
]

// Create child columns with full parameter data
const childColumns = [
  createTableColumn(essentialBimParameters.id, 0),
  createTableColumn(essentialBimParameters.mark, 1),
  createTableColumn(essentialBimParameters.host, 2),
  createTableColumn(essentialBimParameters.category, 3)
]

/**
 * Default table configuration with essential columns
 * Matches GraphQL TableSettings type exactly
 */
export const defaultTableConfig: TableSettings = {
  id: 'default-table',
  name: 'Default Table',
  displayName: 'Default Table',
  parentColumns,
  childColumns,
  categoryFilters: {
    selectedParentCategories: [],
    selectedChildCategories: []
  },
  filters: [], // Empty array, not undefined
  sort: {
    field: undefined,
    order: undefined
  },
  metadata: {}, // Empty object, not undefined
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
    parentColumns: [], // Start with empty columns
    childColumns: [], // Start with empty columns
    categoryFilters: {
      selectedParentCategories: [],
      selectedChildCategories: []
    },
    filters: [], // Empty array, not undefined
    sort: {
      field: undefined,
      order: undefined
    },
    metadata: {}, // Empty object, not undefined
    lastUpdateTimestamp: Date.now()
  }
}
