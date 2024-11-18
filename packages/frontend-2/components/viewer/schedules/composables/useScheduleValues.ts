import { computed } from 'vue'
import type { ElementData, TableRowData } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'
import scheduleStore from './useScheduleStore'
import {
  defaultColumns,
  defaultDetailColumns,
  defaultTable
} from '../config/defaultColumns'
import { debug, DebugCategories } from '../utils/debug'

/**
 * Composable that provides unwrapped store values with proper typing
 */
export function useScheduleValues() {
  // Helper to safely access store values
  const safeStoreAccess = <T>(accessor: () => T, defaultValue: T): T => {
    try {
      return accessor()
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to access store value:', err)
      return defaultValue
    }
  }

  const scheduleData = computed<ElementData[]>(() =>
    safeStoreAccess(() => scheduleStore.scheduleData.value, [])
  )
  const evaluatedData = computed<ElementData[]>(() =>
    safeStoreAccess(() => scheduleStore.evaluatedData.value, [])
  )
  const tableData = computed<TableRowData[]>(() =>
    safeStoreAccess(() => scheduleStore.tableData.value, [])
  )
  const customParameters = computed<CustomParameter[]>(() =>
    safeStoreAccess(() => scheduleStore.customParameters.value, [])
  )
  const parameterColumns = computed<ColumnDef[]>(() =>
    safeStoreAccess(() => scheduleStore.parameterColumns.value, [])
  )
  const mergedParentParameters = computed<CustomParameter[]>(() =>
    safeStoreAccess(() => scheduleStore.mergedParentParameters.value, [])
  )
  const mergedChildParameters = computed<CustomParameter[]>(() =>
    safeStoreAccess(() => scheduleStore.mergedChildParameters.value, [])
  )
  const currentTableColumns = computed<ColumnDef[]>(() =>
    safeStoreAccess(() => scheduleStore.currentTableColumns.value, defaultColumns)
  )
  const currentDetailColumns = computed<ColumnDef[]>(() =>
    safeStoreAccess(
      () => scheduleStore.currentDetailColumns.value,
      defaultDetailColumns
    )
  )
  const mergedTableColumns = computed<ColumnDef[]>(() =>
    safeStoreAccess(() => scheduleStore.mergedTableColumns.value, defaultColumns)
  )
  const mergedDetailColumns = computed<ColumnDef[]>(() =>
    safeStoreAccess(() => scheduleStore.mergedDetailColumns.value, defaultDetailColumns)
  )
  const selectedTableId = computed<string>(() =>
    safeStoreAccess(() => scheduleStore.selectedTableId.value, defaultTable.id)
  )
  const tableName = computed<string>(() =>
    safeStoreAccess(() => scheduleStore.tableName.value, defaultTable.name)
  )
  const currentTableId = computed<string>(() =>
    safeStoreAccess(() => scheduleStore.currentTableId.value, defaultTable.id)
  )
  const tableKey = computed<string>(() =>
    safeStoreAccess(() => scheduleStore.tableKey.value, '0')
  )
  const tablesArray = computed<{ id: string; name: string }[]>(() =>
    safeStoreAccess(() => scheduleStore.tablesArray.value, [])
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
