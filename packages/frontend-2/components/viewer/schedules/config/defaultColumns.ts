import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { NamedTableConfig } from '~/composables/useUserSettings'
import { parentCategories, childCategories } from './categories'

export const defaultColumns: ColumnDef[] = [
  {
    field: 'mark',
    header: 'Mark',
    type: 'string',
    order: 0,
    visible: true,
    removable: false,
    isFixed: true,
    source: 'Basic',
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
    source: 'Basic',
    description: 'Element category'
  },
  {
    field: 'host',
    header: 'Host',
    type: 'string',
    order: 2,
    visible: true,
    removable: true,
    source: 'Basic',
    description: 'Host element mark'
  },
  {
    field: 'length',
    header: 'Length',
    type: 'number',
    order: 4,
    visible: true,
    removable: true,
    source: 'Dimensions',
    description: 'Element length'
  },
  {
    field: 'endLevelOffset',
    header: 'End Level Offset',
    type: 'string',
    order: 3,
    visible: true,
    removable: true,
    source: 'Constraints',
    description: 'End level offset'
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
    source: 'Basic',
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
    source: 'Basic',
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
    source: 'Basic',
    description: 'Host element mark'
  },
  {
    field: 'endLevelOffset',
    header: 'End Level Offset',
    type: 'string',
    order: 3,
    visible: true,
    removable: true,
    source: 'Constraints',
    description: 'End level offset'
  }
]

export const defaultTable: NamedTableConfig = {
  id: 'default-table',
  name: 'Default Table',
  parentColumns: defaultColumns,
  childColumns: defaultDetailColumns,
  categoryFilters: {
    // Initialize with all categories to show all data immediately
    selectedParentCategories: parentCategories,
    selectedChildCategories: childCategories
  },
  customParameters: []
}
