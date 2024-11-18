import { unref } from 'vue'
import type { ElementData, TableRowData } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'
import scheduleStore from './useScheduleStore'
import { defaultColumns, defaultDetailColumns } from '../config/defaultColumns'
import { debug, DebugCategories } from '../utils/debug'

interface ScheduleValues {
  scheduleData: ElementData[]
  evaluatedData: ElementData[]
  tableData: TableRowData[]
  customParameters: CustomParameter[]
  parameterColumns: ColumnDef[]
  currentTableColumns: ColumnDef[]
  currentDetailColumns: ColumnDef[]
  mergedTableColumns: ColumnDef[]
  mergedDetailColumns: ColumnDef[]
  selectedTableId: string
  tableName: string
  currentTableId: string
  tableKey: string
  tablesArray: { id: string; name: string }[]
  debug: boolean
}

const defaultCustomParameter: CustomParameter = {
  id: '',
  name: '',
  type: 'fixed',
  field: '',
  header: ''
}

/**
 * Composable that provides unwrapped store values with proper typing
 */
export function useScheduleValues(): ScheduleValues {
  // Helper to safely access store values
  const safeStoreAccess = <T>(accessor: () => T, defaultValue: T): T => {
    try {
      return accessor()
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to access store value:', err)
      return defaultValue
    }
  }

  // Helper to unwrap computed values
  const unwrapComputed = <T>(computedValue: () => T, defaultValue: T): T => {
    try {
      return unref(computedValue())
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to unwrap computed value:', err)
      return defaultValue
    }
  }

  // Helper to ensure CustomParameter has all required fields
  const ensureCustomParameter = (param: Partial<CustomParameter>): CustomParameter => {
    return {
      ...defaultCustomParameter,
      ...param,
      id: param.id || '',
      name: param.name || '',
      type: param.type || 'fixed',
      field: param.field || '',
      header: param.header || ''
    }
  }

  // Helper to ensure array of CustomParameters
  const ensureCustomParameters = (
    params: Partial<CustomParameter>[]
  ): CustomParameter[] => {
    return params.map(ensureCustomParameter)
  }

  return {
    scheduleData: unwrapComputed(
      () =>
        safeStoreAccess(() => scheduleStore.scheduleData.value, [] as ElementData[]),
      [] as ElementData[]
    ),
    evaluatedData: unwrapComputed(
      () =>
        safeStoreAccess(() => scheduleStore.evaluatedData.value, [] as ElementData[]),
      [] as ElementData[]
    ),
    tableData: unwrapComputed(
      () => safeStoreAccess(() => scheduleStore.tableData.value, [] as TableRowData[]),
      [] as TableRowData[]
    ),
    customParameters: unwrapComputed(
      () =>
        ensureCustomParameters(
          safeStoreAccess(() => scheduleStore.customParameters.value, [])
        ),
      [] as CustomParameter[]
    ),
    parameterColumns: unwrapComputed(
      () =>
        safeStoreAccess(() => scheduleStore.parameterColumns.value, [] as ColumnDef[]),
      [] as ColumnDef[]
    ),
    currentTableColumns: unwrapComputed(
      () =>
        safeStoreAccess(() => scheduleStore.currentTableColumns.value, defaultColumns),
      defaultColumns
    ),
    currentDetailColumns: unwrapComputed(
      () =>
        safeStoreAccess(
          () => scheduleStore.currentDetailColumns.value,
          defaultDetailColumns
        ),
      defaultDetailColumns
    ),
    mergedTableColumns: unwrapComputed(
      () =>
        safeStoreAccess(() => scheduleStore.mergedTableColumns.value, defaultColumns),
      defaultColumns
    ),
    mergedDetailColumns: unwrapComputed(
      () =>
        safeStoreAccess(
          () => scheduleStore.mergedDetailColumns.value,
          defaultDetailColumns
        ),
      defaultDetailColumns
    ),
    selectedTableId: unwrapComputed(
      () => safeStoreAccess(() => scheduleStore.selectedTableId.value, ''),
      ''
    ),
    tableName: unwrapComputed(
      () => safeStoreAccess(() => scheduleStore.tableName.value, ''),
      ''
    ),
    currentTableId: unwrapComputed(
      () => safeStoreAccess(() => scheduleStore.currentTableId.value, ''),
      ''
    ),
    tableKey: unwrapComputed(
      () => safeStoreAccess(() => scheduleStore.tableKey.value, '0'),
      '0'
    ),
    tablesArray: unwrapComputed(
      () => safeStoreAccess(() => scheduleStore.tablesArray.value, []),
      []
    ),
    // Add debug flag to help development
    debug: true
  }
}
