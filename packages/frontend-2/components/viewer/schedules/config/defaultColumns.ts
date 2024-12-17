import type { NamedTableConfig, BimColumnDef } from '~/composables/core/types'
import { createBimColumnDefWithDefaults } from '~/composables/core/types'

// Common columns that should appear in both parent and child tables
const commonColumns: BimColumnDef[] = [
  createBimColumnDefWithDefaults({
    field: 'mark',
    name: 'Mark',
    type: 'string',
    order: 0,
    visible: true,
    removable: false, // Mark column should not be removable since it's used for identification
    isFixed: true,
    description: 'Element mark identifier',
    sourceValue: null,
    fetchedGroup: 'Identity Data',
    currentGroup: 'Identity Data'
  }),
  createBimColumnDefWithDefaults({
    field: 'category',
    name: 'Category',
    type: 'string',
    order: 1,
    visible: true,
    removable: true,
    isFixed: false,
    description: 'Element category',
    sourceValue: null,
    fetchedGroup: 'Identity Data',
    currentGroup: 'Identity Data'
  })
]

export const defaultColumns: BimColumnDef[] = [
  ...commonColumns,
  createBimColumnDefWithDefaults({
    field: 'Dimensions.Width',
    name: 'Width',
    type: 'number',
    order: 4,
    visible: true,
    removable: true,
    isFixed: false,
    description: 'Element width',
    sourceValue: null,
    fetchedGroup: 'Dimensions',
    currentGroup: 'Dimensions'
  }),
  createBimColumnDefWithDefaults({
    field: 'Dimensions.Height',
    name: 'Height',
    type: 'number',
    order: 5,
    visible: true,
    removable: true,
    isFixed: false,
    description: 'Element height',
    sourceValue: null,
    fetchedGroup: 'Dimensions',
    currentGroup: 'Dimensions'
  }),
  createBimColumnDefWithDefaults({
    field: 'Identity Data.Family',
    name: 'Family',
    type: 'string',
    order: 6,
    visible: true,
    removable: true,
    isFixed: false,
    description: 'Element family',
    sourceValue: null,
    fetchedGroup: 'Identity Data',
    currentGroup: 'Identity Data'
  }),
  createBimColumnDefWithDefaults({
    field: 'Dimensions.Length',
    name: 'Length',
    type: 'number',
    order: 7,
    visible: true,
    removable: true,
    isFixed: false,
    description: 'Element length',
    sourceValue: null,
    fetchedGroup: 'Dimensions',
    currentGroup: 'Dimensions'
  })
]

export const defaultDetailColumns: BimColumnDef[] = [
  ...commonColumns,
  createBimColumnDefWithDefaults({
    field: 'Dimensions.Width',
    name: 'Width',
    type: 'number',
    order: 3,
    visible: true,
    removable: true,
    isFixed: false,
    description: 'Element width',
    sourceValue: null,
    fetchedGroup: 'Dimensions',
    currentGroup: 'Dimensions'
  }),
  createBimColumnDefWithDefaults({
    field: 'host',
    name: 'Host',
    type: 'string',
    order: 2,
    visible: true,
    removable: true,
    isFixed: false,
    description: 'Host element mark',
    sourceValue: null,
    fetchedGroup: 'Parameters',
    currentGroup: 'Parameters'
  })
]

export const defaultTable: NamedTableConfig = {
  id: 'default-table',
  name: 'Default Table',
  displayName: 'Default Table',
  parentColumns: defaultColumns,
  childColumns: defaultDetailColumns,
  categoryFilters: {
    // Set default categories as specified
    selectedParentCategories: ['Walls', 'Uncategorized'],
    selectedChildCategories: ['Structural Framing']
  },
  userParameters: [],
  selectedParameterIds: [],
  lastUpdateTimestamp: Date.now()
}
