import type { Component } from 'vue'
import type {
  AvailableBimParameter,
  AvailableUserParameter,
  ParameterMetadata,
  Group
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
  group: Group
  metadata?: ParameterMetadata
  category?: string
  description?: string
}

interface BimColumnParameter extends BaseColumnParameter {
  kind: 'bim'
  type: BimValueType
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
  order: number
  width?: number
  visible: boolean
  removable: boolean
  sortable: boolean
  filterable: boolean
  headerComponent?: Component

  // Parameter data
  parameter: ColumnParameter
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
    order,
    width: 200,
    visible: param.visible ?? true,
    removable: true,
    sortable: true,
    filterable: true
  }

  // Ensure group is a plain object for GraphQL
  const group = {
    fetchedGroup: param.group?.fetchedGroup || 'Ungrouped',
    currentGroup: param.group?.currentGroup || ''
  }

  if (param.kind === 'bim') {
    return {
      ...base,
      parameter: {
        id: param.id,
        name: param.name,
        kind: 'bim',
        type: param.type,
        category: param.category,
        description: param.description,
        value: param.value,
        group,
        metadata: param.metadata
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
      category: param.category,
      description: param.description,
      value: param.value,
      group,
      equation: param.equation,
      metadata: param.metadata
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
