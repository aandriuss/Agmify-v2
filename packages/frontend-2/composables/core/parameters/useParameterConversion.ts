import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type { ColumnDef } from '~/composables/core/types/tables/column-types'
import {
  createBimColumnDefWithDefaults,
  createUserColumnDefWithDefaults
} from '~/composables/core/types/tables/column-types'
import type {
  AvailableParameter,
  AvailableBimParameter,
  AvailableUserParameter,
  ParameterMetadata
} from '~/composables/core/types/parameters/parameter-states'
import { createSelectedParameter } from '~/composables/core/types/parameters/parameter-states'
import type {
  PrimitiveValue,
  BimValueType,
  UserValueType
} from '~/composables/core/types/parameters/value-types'

export class ParameterConversionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParameterConversionError'
  }
}

/**
 * Convert Parameter to ColumnDef
 */
export function parameterToColumnDef(param: AvailableParameter): ColumnDef {
  try {
    debug.startState(DebugCategories.PARAMETERS, 'Converting parameter to column', {
      parameterId: param.id
    })

    // First convert to selected parameter
    const selectedParam = createSelectedParameter(param, 0, true)

    // Then create column definition
    let columnDef: ColumnDef
    if (param.kind === 'bim') {
      columnDef = createBimColumnDefWithDefaults({
        id: selectedParam.id,
        name: selectedParam.name,
        field: selectedParam.id,
        header: selectedParam.name,
        type: selectedParam.type as BimValueType,
        visible: selectedParam.visible,
        removable: true,
        order: selectedParam.order,
        description: selectedParam.description,
        category: selectedParam.category,
        metadata: selectedParam.metadata ? { ...selectedParam.metadata } : undefined,
        sourceValue: param.value as PrimitiveValue,
        fetchedGroup: param.sourceGroup,
        currentGroup: param.currentGroup,
        isFixed: false
      })
    } else {
      columnDef = createUserColumnDefWithDefaults({
        id: selectedParam.id,
        name: selectedParam.name,
        field: selectedParam.id,
        header: selectedParam.name,
        type: selectedParam.type as UserValueType,
        visible: selectedParam.visible,
        removable: true,
        order: selectedParam.order,
        description: selectedParam.description,
        category: selectedParam.category,
        metadata: selectedParam.metadata ? { ...selectedParam.metadata } : undefined,
        group: param.group,
        isCustomParameter: false
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
 * Convert ColumnDef to AvailableParameter
 */
export function columnDefToParameter(col: ColumnDef): AvailableParameter {
  try {
    debug.startState(DebugCategories.PARAMETERS, 'Converting column to parameter', {
      columnId: col.id
    })

    let parameter: AvailableParameter
    if (col.kind === 'bim') {
      const bimParam: AvailableBimParameter = {
        kind: 'bim',
        id: col.id,
        name: col.name,
        type: col.type,
        value: col.value || null,
        sourceGroup: col.fetchedGroup,
        currentGroup: col.currentGroup,
        isSystem: false,
        category: col.category,
        description: col.description,
        metadata: col.metadata as ParameterMetadata | undefined
      }
      parameter = bimParam
    } else {
      const userParam: AvailableUserParameter = {
        kind: 'user',
        id: col.id,
        name: col.name,
        type: col.type,
        value: col.value || null,
        group: col.group,
        category: col.category,
        description: col.description,
        metadata: col.metadata as ParameterMetadata | undefined
      }
      parameter = userParam
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
