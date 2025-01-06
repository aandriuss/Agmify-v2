import type { SelectedParameter } from '../../types/parameters/parameter-states'
import type { TableSettings } from '../store/types'
import { createTableColumns } from '~/composables/core/types/tables/table-column'

// Default selected parameters that should be consistent across the application
export const defaultSelectedParameters: {
  parent: SelectedParameter[]
  child: SelectedParameter[]
} = {
  parent: [
    {
      id: 'Dimensions.Width',
      name: 'Width',
      kind: 'bim' as const,
      type: 'number',
      value: null,
      group: 'Dimensions',
      visible: true,
      order: 4
    },
    {
      id: 'Dimensions.Height',
      name: 'Height',
      kind: 'bim' as const,
      type: 'number',
      value: null,
      group: 'Dimensions',
      visible: true,
      order: 5
    },
    {
      id: 'Identity Data.Family',
      name: 'Family',
      kind: 'bim' as const,
      type: 'string',
      value: null,
      group: 'Identity Data',
      visible: true,
      order: 6
    },
    {
      id: 'Dimensions.Length',
      name: 'Length',
      kind: 'bim' as const,
      type: 'number',
      value: null,
      group: 'Dimensions',
      visible: true,
      order: 7
    }
  ],
  child: [
    {
      id: 'Dimensions.Width',
      name: 'Width',
      kind: 'bim' as const,
      type: 'number',
      value: null,
      group: 'Dimensions',
      visible: true,
      order: 3
    },
    {
      id: 'host',
      name: 'Host',
      kind: 'bim' as const,
      type: 'string',
      value: null,
      group: 'Parameters',
      visible: true,
      order: 2
    }
  ]
}

export const defaultTableConfig: TableSettings = {
  id: 'default-table',
  name: 'Default Table',
  displayName: 'Default Table',
  parentColumns: createTableColumns(defaultSelectedParameters.parent),
  childColumns: createTableColumns(defaultSelectedParameters.child),
  categoryFilters: {
    selectedParentCategories: [],
    selectedChildCategories: []
  },
  selectedParameters: defaultSelectedParameters,
  lastUpdateTimestamp: Date.now()
}
