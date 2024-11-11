import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import { debug } from '../utils/debug'

export const defaultParentColumns: ColumnDef[] = [
  {
    field: 'category',
    header: 'Category',
    type: 'string',
    visible: true,
    removable: false,
    order: 0,
    width: 120,
    description: 'Element category',
    category: 'Basic'
  },
  {
    field: 'id',
    header: 'ID',
    type: 'string',
    visible: true,
    removable: true,
    order: 1,
    width: 100,
    description: 'Element ID',
    category: 'Basic'
  },
  {
    field: 'type',
    header: 'Type',
    type: 'string',
    visible: true,
    removable: true,
    order: 2,
    width: 120,
    description: 'Element type',
    category: 'Basic'
  },
  {
    field: 'mark',
    header: 'Mark',
    type: 'string',
    visible: true,
    removable: true,
    order: 3,
    width: 100,
    description: 'Element mark',
    category: 'Basic'
  },
  {
    field: 'name',
    header: 'Name',
    type: 'string',
    visible: true,
    removable: true,
    order: 4,
    width: 150,
    description: 'Element name',
    category: 'Basic'
  },
  {
    field: 'host',
    header: 'Host',
    type: 'string',
    visible: true,
    removable: true,
    order: 5,
    width: 100,
    description: 'Host element',
    category: 'Basic'
  },
  {
    field: 'width',
    header: 'Width',
    type: 'number',
    visible: true,
    removable: true,
    order: 6,
    width: 100,
    description: 'Element width',
    category: 'Dimensions'
  },
  {
    field: 'height',
    header: 'Height',
    type: 'number',
    visible: true,
    removable: true,
    order: 7,
    width: 100,
    description: 'Element height',
    category: 'Dimensions'
  },
  {
    field: 'thickness',
    header: 'Thickness',
    type: 'number',
    visible: true,
    removable: true,
    order: 8,
    width: 100,
    description: 'Element thickness',
    category: 'Dimensions'
  },
  {
    field: 'area',
    header: 'Area',
    type: 'number',
    visible: true,
    removable: true,
    order: 9,
    width: 100,
    description: 'Element area',
    category: 'Dimensions'
  }
]

export const defaultChildColumns: ColumnDef[] = [
  {
    field: 'category',
    header: 'Category',
    type: 'string',
    visible: true,
    removable: false,
    order: 0,
    width: 120,
    description: 'Element category',
    category: 'Basic'
  },
  {
    field: 'id',
    header: 'ID',
    type: 'string',
    visible: true,
    removable: true,
    order: 1,
    width: 100,
    description: 'Element ID',
    category: 'Basic'
  },
  {
    field: 'type',
    header: 'Type',
    type: 'string',
    visible: true,
    removable: true,
    order: 2,
    width: 120,
    description: 'Element type',
    category: 'Basic'
  },
  {
    field: 'mark',
    header: 'Mark',
    type: 'string',
    visible: true,
    removable: true,
    order: 3,
    width: 100,
    description: 'Element mark',
    category: 'Basic'
  },
  {
    field: 'name',
    header: 'Name',
    type: 'string',
    visible: true,
    removable: true,
    order: 4,
    width: 150,
    description: 'Element name',
    category: 'Basic'
  },
  {
    field: 'host',
    header: 'Host',
    type: 'string',
    visible: true,
    removable: true,
    order: 5,
    width: 100,
    description: 'Host element',
    category: 'Basic'
  },
  {
    field: 'width',
    header: 'Width',
    type: 'number',
    visible: true,
    removable: true,
    order: 6,
    width: 100,
    description: 'Element width',
    category: 'Dimensions'
  },
  {
    field: 'height',
    header: 'Height',
    type: 'number',
    visible: true,
    removable: true,
    order: 7,
    width: 100,
    description: 'Element height',
    category: 'Dimensions'
  },
  {
    field: 'length',
    header: 'Length',
    type: 'number',
    visible: true,
    removable: true,
    order: 8,
    width: 100,
    description: 'Element length',
    category: 'Dimensions'
  }
]

// Validate column configurations
if (!debug.validateColumns(defaultParentColumns)) {
  throw new Error('Invalid parent columns configuration')
}

if (!debug.validateColumns(defaultChildColumns)) {
  throw new Error('Invalid child columns configuration')
}

// Log column configurations
debug.log('Default parent columns:', defaultParentColumns)
debug.logColumnVisibility(defaultParentColumns)

debug.log('Default child columns:', defaultChildColumns)
debug.logColumnVisibility(defaultChildColumns)
