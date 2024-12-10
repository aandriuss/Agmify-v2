import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type { ColumnDef } from '~/composables/core/types/tables/column-types'
import {
  createBimColumnDefWithDefaults,
  createUserColumnDefWithDefaults
} from '~/composables/core/types/tables/column-types'
import type { Parameter } from '~/composables/core/types/parameters/parameter-types'
import type { PrimitiveValue } from '~/composables/core/types/parameters/value-types'

export class ParameterConversionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParameterConversionError'
  }
}

/**
 * Convert Parameter to ColumnDef
 */
export function parameterToColumnDef(param: Parameter): ColumnDef {
  try {
    debug.startState(DebugCategories.PARAMETERS, 'Converting parameter to column', {
      parameterId: param.id
    })

    const base = {
      id: param.id,
      name: param.name,
      field: param.field,
      header: param.header,
      category: param.category,
      description: param.description,
      visible: param.visible ?? true,
      removable: param.removable ?? true,
      metadata: param.metadata,
      order: param.order ?? 0,
      sortable: true,
      filterable: true
    }

    let columnDef: ColumnDef
    if (param.kind === 'bim') {
      columnDef = createBimColumnDefWithDefaults({
        ...base,
        type: param.type,
        sourceValue: param.sourceValue,
        fetchedGroup: param.fetchedGroup,
        currentGroup: param.currentGroup,
        isFixed: false
      })
    } else {
      columnDef = createUserColumnDefWithDefaults({
        ...base,
        type: param.type,
        group: param.group,
        isCustomParameter: param.isCustom
      })
    }

    debug.completeState(DebugCategories.PARAMETERS, 'Parameter converted to column')
    return columnDef
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to convert parameter to column:', err)
    throw new ParameterConversionError(
      `Failed to convert parameter ${param.id} to column`
    )
  }
}

/**
 * Convert ColumnDef to Parameter
 */
export function columnDefToParameter(col: ColumnDef): Parameter {
  try {
    debug.startState(DebugCategories.PARAMETERS, 'Converting column to parameter', {
      columnId: col.id
    })

    const base = {
      id: col.id,
      name: col.name,
      field: col.field,
      header: col.header,
      category: col.category,
      description: col.description,
      visible: col.visible,
      removable: col.removable,
      metadata: col.metadata,
      order: col.order,
      value: col.value
    }

    let parameter: Parameter
    if (col.kind === 'bim') {
      parameter = {
        ...base,
        kind: 'bim',
        type: col.type,
        sourceValue: col.sourceValue,
        fetchedGroup: col.fetchedGroup,
        currentGroup: col.currentGroup
      }
    } else {
      parameter = {
        ...base,
        kind: 'user',
        type: col.type,
        group: col.group,
        isCustom: col.isCustomParameter
      }
    }

    debug.completeState(DebugCategories.PARAMETERS, 'Column converted to parameter')
    return parameter
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to convert column to parameter:', err)
    throw new ParameterConversionError(
      `Failed to convert column ${col.id} to parameter`
    )
  }
}

/**
 * Safe clone of ColumnDef array
 */
export function cloneColumnDefs(columns: ColumnDef[]): ColumnDef[] {
  try {
    debug.startState(DebugCategories.PARAMETERS, 'Cloning column definitions')

    const clonedColumns = columns.map((col) => {
      if (col.kind === 'bim') {
        return createBimColumnDefWithDefaults({
          ...col,
          sourceValue: col.sourceValue
        })
      } else {
        return createUserColumnDefWithDefaults({
          ...col
        })
      }
    })

    debug.completeState(DebugCategories.PARAMETERS, 'Column definitions cloned')
    return clonedColumns
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to clone column definitions:', err)
    throw new ParameterConversionError('Failed to clone column definitions')
  }
}

/**
 * Create a new ColumnDef with default values
 */
export function createColumnDef(
  partial: Partial<ColumnDef> & { kind: 'bim' | 'user' }
): ColumnDef {
  try {
    debug.startState(DebugCategories.PARAMETERS, 'Creating column definition')

    if (partial.kind === 'bim') {
      const sourceValue = partial.sourceValue ?? (null as PrimitiveValue)
      return createBimColumnDefWithDefaults({
        ...partial,
        field: partial.field || '',
        sourceValue
      })
    }

    return createUserColumnDefWithDefaults({
      ...partial,
      field: partial.field || ''
    })
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to create column definition:', err)
    throw new ParameterConversionError('Failed to create column definition')
  }
}
