import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { NamedTableConfig } from '~/composables/useUserSettings'

export const defaultColumns: ColumnDef[] = [
  {
    field: 'mark',
    header: 'Mark',
    type: 'string',
    order: 0,
    visible: true,
    removable: false,
    isFixed: true,
    source: 'Essential', // Legacy support
    fetchedGroup: 'Essential',
    currentGroup: 'Essential',
    isFetched: false,
    description: 'Element mark identifier'
  },
  {
    field: 'category',
    header: 'Category',
    type: 'string',
    order: 1,
    visible: true,
    removable: false,
    isFixed: true,
    source: 'Essential', // Legacy support
    fetchedGroup: 'Essential',
    currentGroup: 'Essential',
    isFetched: false,
    description: 'Element category'
  },
  {
    field: 'host',
    header: 'Host',
    type: 'string',
    order: 2,
    visible: true,
    removable: true,
    source: 'Essential', // Legacy support
    fetchedGroup: 'Essential',
    currentGroup: 'Essential',
    isFetched: false,
    description: 'Host element mark'
  }
]

export const defaultDetailColumns: ColumnDef[] = [
  {
    field: 'mark',
    header: 'Mark',
    type: 'string',
    order: 0,
    visible: true,
    removable: false,
    isFixed: true,
    source: 'Essential', // Legacy support
    fetchedGroup: 'Essential',
    currentGroup: 'Essential',
    isFetched: false,
    description: 'Element mark identifier'
  },
  {
    field: 'category',
    header: 'Category',
    type: 'string',
    order: 1,
    visible: true,
    removable: false,
    isFixed: true,
    source: 'Essential', // Legacy support
    fetchedGroup: 'Essential',
    currentGroup: 'Essential',
    isFetched: false,
    description: 'Element category'
  },
  {
    field: 'host',
    header: 'Host',
    type: 'string',
    order: 2,
    visible: true,
    removable: false,
    isFixed: true, // Host is required for child elements
    source: 'Essential', // Legacy support
    fetchedGroup: 'Essential',
    currentGroup: 'Essential',
    isFetched: false,
    description: 'Host element mark'
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
