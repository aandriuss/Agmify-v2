import type { NamedTableConfig } from '../../types'
import type { SelectedParameter } from '../../types/parameters/parameter-states'
import type { BimValueType } from '../../types/parameters/value-types'
import { isPrimitiveValue } from '../../types/parameters/value-types'
import { createBimColumnDefWithDefaults } from '../../types/tables/column-types'

// Default selected parameters that should be consistent across the application
export const defaultSelectedParameters: {
  parent: SelectedParameter[]
  child: SelectedParameter[]
} = {
  parent: [
    {
      id: 'Identity Data.Id',
      name: 'Id',
      kind: 'bim' as const,
      type: 'string',
      value: null,
      group: 'Identity Data',
      visible: true,
      order: 0
    },
    {
      id: 'mark',
      name: 'Mark',
      kind: 'bim' as const,
      type: 'string',
      value: null,
      group: 'Identity Data',
      visible: true,
      order: 1
    },
    {
      id: 'category',
      name: 'Category',
      kind: 'bim' as const,
      type: 'string',
      value: null,
      group: 'Identity Data',
      visible: true,
      order: 2
    },
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
      id: 'Identity Data.Id',
      name: 'Id',
      kind: 'bim' as const,
      type: 'string',
      value: null,
      group: 'Identity Data',
      visible: true,
      order: 0
    },
    {
      id: 'mark',
      name: 'Mark',
      kind: 'bim' as const,
      type: 'string',
      value: null,
      group: 'Identity Data',
      visible: true,
      order: 1
    },
    {
      id: 'category',
      name: 'Category',
      kind: 'bim' as const,
      type: 'string',
      value: null,
      group: 'Identity Data',
      visible: true,
      order: 2
    },
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

/**
 * Convert selected parameters to column definitions
 */
function createColumnsFromSelectedParameters(selectedParams: SelectedParameter[]) {
  return selectedParams.map((param) =>
    createBimColumnDefWithDefaults({
      id: param.id,
      name: param.name,
      field: param.id,
      header: param.name,
      type: param.type as BimValueType,
      visible: param.visible,
      order: param.order,
      removable: param.id !== 'mark', // Mark column should not be removable
      description: param.name,
      sourceValue: isPrimitiveValue(param.value) ? param.value : null,
      fetchedGroup: param.group,
      currentGroup: param.group
    })
  )
}

export const defaultTableConfig: NamedTableConfig = {
  id: 'default-table',
  name: 'Default Table',
  displayName: 'Default Table',
  parentColumns: createColumnsFromSelectedParameters(defaultSelectedParameters.parent),
  childColumns: createColumnsFromSelectedParameters(defaultSelectedParameters.child),
  categoryFilters: {
    selectedParentCategories: [],
    selectedChildCategories: []
  },
  selectedParameters: defaultSelectedParameters,
  lastUpdateTimestamp: Date.now()
}

/**
 * Ensure required columns are present in table configuration
 */
export function ensureRequiredColumns(config: NamedTableConfig): NamedTableConfig {
  const selectedParams = config.selectedParameters || defaultSelectedParameters

  return {
    ...config,
    parentColumns: config.parentColumns.length
      ? config.parentColumns
      : createColumnsFromSelectedParameters(selectedParams.parent),
    childColumns: config.childColumns.length
      ? config.childColumns
      : createColumnsFromSelectedParameters(selectedParams.child),
    categoryFilters: config.categoryFilters || defaultTableConfig.categoryFilters,
    selectedParameters: selectedParams,
    lastUpdateTimestamp: config.lastUpdateTimestamp || Date.now()
  }
}
