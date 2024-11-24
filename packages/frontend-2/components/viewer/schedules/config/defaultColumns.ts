import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { NamedTableConfig } from '~/composables/useUserSettings'

// Common columns that should appear in both parent and child tables
const commonColumns: ColumnDef[] = [
  {
    field: 'mark',
    header: 'Mark',
    type: 'string',
    order: 0,
    visible: true,
    removable: false, // Mark column should not be removable since it's used for identification
    isFixed: true,
    description: 'Element mark identifier',
    source: 'Parameters',
    isFetched: true,
    isCustomParameter: false,
    fetchedGroup: 'Parameters',
    currentGroup: 'Parameters'
  },
  {
    field: 'category',
    header: 'Category',
    type: 'string',
    order: 1,
    visible: true,
    removable: true,
    isFixed: false,
    description: 'Element category',
    source: 'Parameters',
    isFetched: true,
    isCustomParameter: false,
    fetchedGroup: 'Parameters',
    currentGroup: 'Parameters'
  }
]

export const defaultColumns: ColumnDef[] = [
  ...commonColumns,
  {
    field: 'width',
    header: 'Width',
    type: 'number',
    category: 'dimensions',
    description: 'Element width',
    visible: true,
    order: 4,
    removable: true,
    source: 'Parameters',
    isFetched: true,
    isFixed: false,
    isCustomParameter: false,
    fetchedGroup: 'Parameters',
    currentGroup: 'Parameters'
  },
  {
    field: 'height',
    header: 'Height',
    type: 'number',
    category: 'dimensions',
    description: 'Element height',
    visible: true,
    order: 5,
    removable: true,
    source: 'Parameters',
    isFetched: true,
    isFixed: false,
    isCustomParameter: false,
    fetchedGroup: 'Parameters',
    currentGroup: 'Parameters'
  },
  {
    field: 'family',
    header: 'Family',
    type: 'string',
    category: 'other',
    description: 'Element family',
    visible: true,
    order: 6,
    removable: true,
    source: 'Parameters',
    isFetched: true,
    isFixed: false,
    isCustomParameter: false,
    fetchedGroup: 'Parameters',
    currentGroup: 'Parameters'
  },
  {
    field: 'length',
    header: 'Length',
    type: 'number',
    category: 'dimensions',
    description: 'Element length',
    visible: true,
    order: 7,
    removable: true,
    source: 'Parameters',
    isFetched: true,
    isFixed: false,
    isCustomParameter: false,
    fetchedGroup: 'Parameters',
    currentGroup: 'Parameters'
  }
]

export const defaultDetailColumns: ColumnDef[] = [
  ...commonColumns,
  {
    field: 'width',
    header: 'Width',
    type: 'string',
    order: 3,
    visible: true,
    removable: true,
    isFixed: false,
    description: 'Element width',
    source: 'Parameters',
    isFetched: true,
    isCustomParameter: false,
    fetchedGroup: 'Parameters',
    currentGroup: 'Parameters'
  },
  {
    field: 'host',
    header: 'Host',
    type: 'string',
    order: 2,
    visible: true,
    removable: true,
    isFixed: false,
    description: 'Host element mark',
    source: 'Parameters',
    isFetched: true,
    isCustomParameter: false,
    fetchedGroup: 'Parameters',
    currentGroup: 'Parameters'
  }
]

export const defaultTable: NamedTableConfig = {
  id: 'default-table',
  name: 'Default Table',
  parentColumns: defaultColumns,
  childColumns: defaultDetailColumns,
  categoryFilters: {
    // Set default categories as specified
    selectedParentCategories: ['Walls', 'Uncategorized'],
    selectedChildCategories: ['Structural Framing']
  },
  customParameters: []
}
