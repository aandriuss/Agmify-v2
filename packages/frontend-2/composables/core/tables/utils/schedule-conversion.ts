import type { ElementData, TableRow } from '~/composables/core/types'
import type { ScheduleRow } from '~/composables/core/types/tables/schedule-types'
import { toTableParameter } from '~/composables/core/types/tables/parameter-table-types'
import { toScheduleRow } from '~/composables/core/types/tables/schedule-types'
import {
  convertBimToUserType,
  createUserParameterWithDefaults
} from '~/composables/core/types/parameters'
import type { BimValueType, PrimitiveValue } from '~/composables/core/types/parameters'
import {
  isElementData,
  isTableRow,
  toElementData,
  toElementDataArray
} from '~/composables/core/utils/conversion/table-conversion'

/**
 * Convert raw data to schedule rows
 * Handles conversion from ElementData/TableRow through the parameter system
 */
export function toScheduleRows(data: (ElementData | TableRow)[]): ScheduleRow[] {
  // First convert all data to ElementData
  const elementData = data
    .map((item) => (isTableRow(item) ? toElementData(item) : item))
    .filter(isElementData)

  // Then convert each ElementData to ScheduleRow
  return elementData.map((item) => {
    const userParam = createUserParameterWithDefaults({
      id: item.id,
      name: item.name,
      field: item.field,
      header: item.header,
      type: convertBimToUserType(item.type as BimValueType),
      group: item.category || 'default',
      value: null as PrimitiveValue,
      visible: item.visible,
      removable: item.removable,
      order: item.order,
      metadata: item.metadata
    })

    return toScheduleRow(toTableParameter(userParam))
  })
}

// Re-export existing conversion utilities for convenience
export {
  toElementData,
  toElementDataArray,
  isElementData,
  isTableRow,
  toTableParameter,
  toScheduleRow
}
