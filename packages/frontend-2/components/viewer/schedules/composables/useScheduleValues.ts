import { computed } from 'vue'
import type { ElementData, TableRowData } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'
import scheduleStore from './useScheduleStore'

/**
 * Composable that provides unwrapped store values with proper typing
 */
export function useScheduleValues() {
  const scheduleData = computed<ElementData[]>(() => scheduleStore.scheduleData.value)
  const evaluatedData = computed<ElementData[]>(() => scheduleStore.evaluatedData.value)
  const tableData = computed<TableRowData[]>(() => scheduleStore.tableData.value)
  const customParameters = computed<CustomParameter[]>(
    () => scheduleStore.customParameters.value
  )
  const parameterColumns = computed<ColumnDef[]>(
    () => scheduleStore.parameterColumns.value
  )
  const mergedParentParameters = computed<CustomParameter[]>(
    () => scheduleStore.mergedParentParameters.value
  )
  const mergedChildParameters = computed<CustomParameter[]>(
    () => scheduleStore.mergedChildParameters.value
  )
  const currentTableColumns = computed<ColumnDef[]>(
    () => scheduleStore.currentTableColumns.value
  )
  const currentDetailColumns = computed<ColumnDef[]>(
    () => scheduleStore.currentDetailColumns.value
  )
  const mergedTableColumns = computed<ColumnDef[]>(
    () => scheduleStore.mergedTableColumns.value
  )
  const mergedDetailColumns = computed<ColumnDef[]>(
    () => scheduleStore.mergedDetailColumns.value
  )
  const selectedTableId = computed<string>(() => scheduleStore.selectedTableId.value)
  const tableName = computed<string>(() => scheduleStore.tableName.value)
  const currentTableId = computed<string>(() => scheduleStore.currentTableId.value)
  const tableKey = computed<string>(() => scheduleStore.tableKey.value)
  const tablesArray = computed<{ id: string; name: string }[]>(
    () => scheduleStore.tablesArray.value
  )

  return {
    scheduleData,
    evaluatedData,
    tableData,
    customParameters,
    parameterColumns,
    mergedParentParameters,
    mergedChildParameters,
    currentTableColumns,
    currentDetailColumns,
    mergedTableColumns,
    mergedDetailColumns,
    selectedTableId,
    tableName,
    currentTableId,
    tableKey,
    tablesArray
  }
}
