import type {
  AvailableBimParameter,
  SelectedParameter
} from '../../types/parameters/parameter-states'
import type { TableSettings } from '../store/types'
import { createSelectedParameter } from '../../types/parameters/parameter-states'
import { createTableColumns } from '~/composables/core/types/tables/table-column'

/**
 * Essential parameters that should always be available
 */
const essentialBimParameters: Record<string, AvailableBimParameter> = {
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

/**
 * Default selected parameters for parent elements
 */
const defaultParentParameters: SelectedParameter[] = [
  createSelectedParameter(essentialBimParameters.id, 0),
  createSelectedParameter(essentialBimParameters.mark, 1),
  createSelectedParameter(essentialBimParameters.category, 2)
]

/**
 * Default selected parameters for child elements
 */
const defaultChildParameters: SelectedParameter[] = [
  createSelectedParameter(essentialBimParameters.id, 0),
  createSelectedParameter(essentialBimParameters.mark, 1),
  createSelectedParameter(essentialBimParameters.host, 2),
  createSelectedParameter(essentialBimParameters.category, 3)
]

/**
 * Default selected parameters that should be consistent across the application
 */
export const defaultSelectedParameters: {
  parent: SelectedParameter[]
  child: SelectedParameter[]
} = {
  parent: defaultParentParameters,
  child: defaultChildParameters
}

/**
 * Default table configuration
 */
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
  filters: [],
  lastUpdateTimestamp: Date.now()
}
