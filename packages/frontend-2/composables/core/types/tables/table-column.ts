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
  sortable?: boolean
  filterable?: boolean
  width?: number
  order: number
  headerComponent?: Component

  // Link to data
  parameter: SelectedParameter
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
  return params.map(createTableColumn)
}
