import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { NamedTableConfig } from '~/composables/useUserSettings'

export const defaultColumns: ColumnDef[] = [
  {
    field: 'width',
    header: 'Width',
    type: 'number',
    category: 'dimensions',
    description: 'Element width',
    visible: true,
    order: 4,
    removable: true,
    source: 'Parameters'
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
    source: 'Parameters'
  },
  {
    field: 'length',
    header: 'Length',
    type: 'number',
    category: 'dimensions',
    description: 'Element length',
    visible: true,
    order: 6,
    removable: true,
    source: 'Parameters'
  }
]

export const defaultDetailColumns: ColumnDef[] = [
  {
    field: 'mark',
    header: 'Mark',
    type: 'string',
    order: 0,
    visible: true,
    removable: true,
    isFixed: false,
    description: 'Element mark identifier'
  },
  {
    field: 'category',
    header: 'Category',
    type: 'string',
    order: 1,
    visible: true,
    removable: true,
    isFixed: false,
    description: 'Element category'
  },
  {
    field: 'width',
    header: 'Width',
    type: 'string',
    order: 1,
    visible: true,
    removable: true,
    isFixed: false,
    description: 'Element width'
  },
  {
    field: 'host',
    header: 'Host',
    type: 'string',
    order: 2,
    visible: true,
    removable: true,
    isFixed: false,
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
