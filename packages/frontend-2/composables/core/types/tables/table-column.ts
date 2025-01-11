import type { Component } from 'vue'
import type {
  AvailableBimParameter,
  AvailableUserParameter,
  ParameterMetadata
} from '../parameters/parameter-states'
import type { BimValueType, UserValueType, ParameterValue } from '../parameters'

/**
 * Parameter data stored in column
 */
interface BaseColumnParameter {
  id: string
  name: string
  kind: 'bim' | 'user'
  type: BimValueType | UserValueType
  value: ParameterValue
  group: string
  metadata?: ParameterMetadata
  category?: string
  description?: string
}

interface BimColumnParameter extends BaseColumnParameter {
  kind: 'bim'
  type: BimValueType
  currentGroup: string
  fetchedGroup: string
}

interface UserColumnParameter extends BaseColumnParameter {
  kind: 'user'
  type: UserValueType
  equation?: string
}

type ColumnParameter = BimColumnParameter | UserColumnParameter

/**
 * Column definition for tables
 * Separates display properties from parameter data
 */
export interface TableColumn {
  // Display properties
  id: string
  field: string
  header: string
  visible: boolean
  removable: boolean
  sortable: boolean
  filterable: boolean
  width?: number
  order: number
  headerComponent?: Component

  // Parameter data
  parameter: ColumnParameter
}

/**
 * Create a base column without parameter
 */
export function createBaseColumn(
  id: string,
  header: string,
  order: number
): TableColumn {
  return {
    id,
    field: id,
    header,
    visible: true,
    sortable: true,
    filterable: true,
    removable: true,
    order,
    parameter: {
      id,
      name: header,
      kind: 'bim',
      type: 'string',
      value: '',
      group: 'Base Properties',
      currentGroup: 'Base Properties',
      fetchedGroup: 'Base Properties',
      metadata: {
        isSystem: true,
        displayName: header,
        originalGroup: 'Base Properties',
        groupId: 'bim_Base Properties'
      }
    }
  }
}

/**
 * Create a column from an available parameter
 */
export function createTableColumn(
  param: AvailableBimParameter | AvailableUserParameter,
  order: number
): TableColumn {
  const base = {
    id: param.id,
    field: param.id,
    header: param.name,
    visible: param.visible ?? true,
    sortable: true,
    filterable: true,
    removable: true,
    order
  }

  if (param.kind === 'bim') {
    return {
      ...base,
      parameter: {
        id: param.id,
        name: param.name,
        kind: 'bim',
        type: param.type,
        value: param.value,
        group: param.currentGroup,
        currentGroup: param.currentGroup,
        fetchedGroup: param.fetchedGroup,
        metadata: param.metadata,
        category: param.category,
        description: param.description
      }
    }
  }

  return {
    ...base,
    parameter: {
      id: param.id,
      name: param.name,
      kind: 'user',
      type: param.type,
      value: param.value,
      group: param.group,
      equation: param.equation,
      metadata: param.metadata,
      category: param.category,
      description: param.description
    }
  }
}

/**
 * Create multiple table columns from available parameters
 * Assigns order based on array index
 */
export function createTableColumns(
  params: Array<AvailableBimParameter | AvailableUserParameter>
): TableColumn[] {
  return params.map((param, index) => createTableColumn(param, index))
}
