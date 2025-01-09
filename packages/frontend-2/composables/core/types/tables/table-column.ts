import type { SelectedParameter } from '../parameters/parameter-states'

import type { Component } from 'vue'

/**
 * Simple column definition for tables
 * Separates display properties from data
 */
export interface TableColumn {
  // Display properties
  id: string
  field: string
  header: string
  visible: boolean
  removable?: boolean
  sortable?: boolean
  filterable?: boolean
  width?: number
  order: number
  headerComponent?: Component

  // Link to data
  parameter: SelectedParameter
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
    order,
    parameter: {
      header,
      removable: true,
      id,
      name: header,
      kind: 'bim' as const,
      type: 'string' as const,
      value: '',
      group: 'Base Properties',
      visible: true,
      order,
      category: 'Base',
      metadata: {
        isSystem: true
      },
      sourceValue: '',
      fetchedGroup: '',
      currentGroup: '',
      field: ''
    }
  }
}

/**
 * Convert a SelectedParameter to a TableColumn
 */
export function createTableColumn(param: SelectedParameter): TableColumn {
  return {
    id: param.id,
    field: param.id,
    header: param.name,
    visible: param.visible,
    sortable: true,
    filterable: true,
    order: param.order,
    parameter: param
  }
}

/**
 * Convert an array of SelectedParameters to TableColumns
 */
export function createTableColumns(params: SelectedParameter[]): TableColumn[] {
  // Create columns while preserving all parameter data
  return params.map((param) => ({
    id: param.id,
    field: param.id,
    header: param.name,
    visible: param.visible,
    sortable: true,
    filterable: true,
    order: param.order,
    parameter: param // Keep original parameter data intact
  }))
}
