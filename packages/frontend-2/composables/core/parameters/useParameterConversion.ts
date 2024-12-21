import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type { TableColumn } from '~/composables/core/types/tables/table-column'
import { createTableColumn } from '~/composables/core/types/tables/table-column'
import type { SelectedParameter } from '~/composables/core/types/parameters/parameter-states'

export class ParameterConversionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParameterConversionError'
  }
}

/**
 * Safe clone of TableColumn array
 */
export function cloneTableColumns(columns: TableColumn[]): TableColumn[] {
  try {
    debug.startState(DebugCategories.PARAMETERS, 'Cloning table columns')

    const clonedColumns = columns.map((col) => createTableColumn(col.parameter))

    debug.completeState(DebugCategories.PARAMETERS, 'Table columns cloned')
    return clonedColumns
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to clone table columns:', err)
    throw new ParameterConversionError('Failed to clone table columns')
  }
}

/**
 * Create a new TableColumn from a SelectedParameter
 */
export function createColumn(parameter: SelectedParameter): TableColumn {
  try {
    debug.startState(DebugCategories.PARAMETERS, 'Creating table column')
    const column = createTableColumn(parameter)
    debug.completeState(DebugCategories.PARAMETERS, 'Table column created')
    return column
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to create table column:', err)
    throw new ParameterConversionError('Failed to create table column')
  }
}
