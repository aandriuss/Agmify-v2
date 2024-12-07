import type { Parameter } from '../types/parameters'
import type { ColumnDef, NamedTableConfig } from '../types/tables'
import { isBimParameter } from './parameters'

/**
 * Create column definition from parameter
 */
export function createColumnDef(param: Parameter): ColumnDef {
  const columnId = `col_${param.id}`
  const currentGroup = isBimParameter(param) ? param.currentGroup : param.group

  const column: ColumnDef = {
    id: columnId,
    name: param.name,
    field: param.field,
    header: param.header,
    type: param.type,
    source: param.source,
    category: param.category,
    visible: param.visible,
    order: param.order,
    width: 150,
    sortable: true,
    filterable: true,
    metadata: param.metadata,
    description: param.description,
    isFixed: param.type === 'fixed',
    isCustomParameter: param.kind === 'user',
    parameterRef: param.id,
    removable: param.removable,
    currentGroup,
    fetchedGroup: isBimParameter(param) ? param.fetchedGroup : undefined
  }

  return column
}

/**
 * Create table configuration
 */
export function createTableConfig(
  id: string,
  name: string,
  displayName?: string,
  description?: string
): NamedTableConfig {
  return {
    id,
    name,
    displayName: displayName || name,
    description,
    parentColumns: [],
    childColumns: [],
    categoryFilters: {
      selectedParentCategories: [],
      selectedChildCategories: []
    },
    selectedParameterIds: [],
    metadata: {},
    lastUpdateTimestamp: Date.now()
  }
}
