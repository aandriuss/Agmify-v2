import type { ColumnDef, Parameter } from '~/composables/core/types'
import {
  createBimColumnDefWithDefaults,
  createUserColumnDefWithDefaults,
  isBimColumnDef,
  isUserColumnDef,
  parameterToColumnDef
} from '~/composables/core/types/tables/column-types'

/**
 * Extract group and name from parameter field
 */
function extractGroupAndName(field: string): { group: string; name: string } {
  const parts = field.split('.')
  if (parts.length > 1) {
    return {
      group: parts[0],
      name: parts[parts.length - 1]
    }
  }
  return {
    group: 'Parameters',
    name: field
  }
}

/**
 * Create columns from parameters or field strings
 */
export function createColumnsFromParameters(
  parameters: (Parameter | string)[],
  defaultColumns: ColumnDef[] = []
): ColumnDef[] {
  // Convert parameters to column definitions
  const parameterColumns = parameters.map((param) => {
    if (typeof param === 'string') {
      // If param is a field string, find matching default column or create new
      const defaultColumn = defaultColumns.find((col) => col.field === param)
      if (defaultColumn) return defaultColumn

      // Extract group and name from parameter field
      const { group, name } = extractGroupAndName(param)

      // Create basic column if no default found
      return createBimColumnDefWithDefaults({
        field: param,
        name,
        type: 'string',
        sourceValue: null,
        fetchedGroup: group,
        currentGroup: group
      })
    }
    // If param is a Parameter object, convert to column
    const column = parameterToColumnDef(param)

    // Ensure group is preserved for BIM parameters
    if (isBimColumnDef(column)) {
      const { group } = extractGroupAndName(column.field)
      return {
        ...column,
        fetchedGroup: group,
        currentGroup: column.currentGroup || group
      }
    }

    return column
  })

  // If no default columns provided, return parameter columns
  if (!defaultColumns.length) return parameterColumns

  // Merge with default columns
  return mergeColumns(parameterColumns, defaultColumns)
}

/**
 * Merge new columns with existing columns, preserving settings
 */
export function mergeColumns(
  newColumns: ColumnDef[],
  existingColumns: ColumnDef[]
): ColumnDef[] {
  // Create a map of existing columns by field for quick lookup
  const existingMap = new Map(existingColumns.map((col) => [col.field, col]))

  // Merge columns, preserving existing settings where possible
  return newColumns.map((newCol, index) => {
    const existingCol = existingMap.get(newCol.field)
    if (!existingCol) {
      // For new columns, just set order and visible
      if (isBimColumnDef(newCol)) {
        // Extract group for new BIM columns
        const { group } = extractGroupAndName(newCol.field)
        return createBimColumnDefWithDefaults({
          ...newCol,
          order: index,
          visible: true,
          fetchedGroup: group,
          currentGroup: newCol.currentGroup || group
        })
      }
      if (isUserColumnDef(newCol)) {
        return createUserColumnDefWithDefaults({
          ...newCol,
          order: index,
          visible: true
        })
      }
      return newCol
    }

    // For existing columns, preserve settings based on kind
    if (isBimColumnDef(newCol) && isBimColumnDef(existingCol)) {
      return createBimColumnDefWithDefaults({
        ...newCol,
        visible: existingCol.visible,
        order: existingCol.order ?? index,
        width: existingCol.width,
        sortable: existingCol.sortable,
        filterable: existingCol.filterable,
        headerComponent: existingCol.headerComponent,
        color: existingCol.color,
        expander: existingCol.expander,
        currentGroup: existingCol.currentGroup || newCol.currentGroup
      })
    }

    if (isUserColumnDef(newCol) && isUserColumnDef(existingCol)) {
      return createUserColumnDefWithDefaults({
        ...newCol,
        visible: existingCol.visible,
        order: existingCol.order ?? index,
        width: existingCol.width,
        sortable: existingCol.sortable,
        filterable: existingCol.filterable,
        headerComponent: existingCol.headerComponent,
        color: existingCol.color,
        expander: existingCol.expander
      })
    }

    // If kinds don't match (shouldn't happen), return new column with basic settings
    return {
      ...newCol,
      order: index,
      visible: true
    }
  })
}
