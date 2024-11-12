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
    isFixed: true
  },
  {
    field: 'category',
    header: 'Category',
    type: 'string',
    order: 1,
    visible: true,
    removable: false,
    isFixed: true
  },
  {
    field: 'host',
    header: 'Host',
    type: 'string',
    order: 2,
    visible: true,
    removable: true
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
    isFixed: true
  },
  {
    field: 'category',
    header: 'Category',
    type: 'string',
    order: 1,
    visible: true,
    removable: false,
    isFixed: true
  }
]

export const defaultTable: NamedTableConfig = {
  id: 'default-table',
  name: 'Default Table',
  parentColumns: defaultColumns,
  childColumns: defaultDetailColumns,
  categoryFilters: {
    selectedParentCategories: [],
    selectedChildCategories: []
  },
  customParameters: []
}
