import { watch, watchEffect } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { ElementData, TableConfig, AvailableHeaders } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'
import { debug, DebugCategories } from '../utils/debug'

interface UseScheduleWatchersOptions {
  currentTable: Ref<TableConfig | null>
  scheduleData: Ref<ElementData[]>
  tableData: ComputedRef<ElementData[]>
  mergedTableColumns: ComputedRef<ColumnDef[]>
  mergedDetailColumns: ComputedRef<ColumnDef[]>
  customParameters: ComputedRef<CustomParameter[]>
  parameterColumns: ComputedRef<ColumnDef[]>
  evaluatedData: ComputedRef<ElementData[]>
  availableHeaders: Ref<AvailableHeaders>
  mergedParentParameters: ComputedRef<CustomParameter[]>
  mergedChildParameters: ComputedRef<CustomParameter[]>
  selectedParentCategories: Ref<string[]>
  selectedChildCategories: Ref<string[]>
  settings: Ref<{ namedTables?: Record<string, TableConfig> } | null>
  tablesArray: ComputedRef<{ id: string; name: string }[]>
  tableName: Ref<string>
  selectedTableId: Ref<string>
  currentTableId: Ref<string>
  tableKey: Ref<string>
  showCategoryOptions: Ref<boolean>
  showParameterManager: Ref<boolean>
  loadingError: Ref<Error | null>
}

export function useScheduleWatchers(options: UseScheduleWatchersOptions) {
  const {
    currentTable,
    scheduleData,
    tableData,
    mergedTableColumns,
    mergedDetailColumns,
    customParameters,
    parameterColumns,
    evaluatedData,
    availableHeaders,
    mergedParentParameters,
    mergedChildParameters,
    selectedParentCategories,
    selectedChildCategories,
    settings,
    tableName,
    selectedTableId,
    tableKey,
    showCategoryOptions,
    showParameterManager,
    loadingError
  } = options

  // Use watchEffect to handle cleanup automatically
  const stopWatchers = watchEffect((onCleanup) => {
    debug.startState('watcherSetup')

    // Enhanced category watchers - only for logging
    const unwatchParentCategories = watch(
      () => selectedParentCategories.value,
      (newCategories, oldCategories) => {
        debug.log(DebugCategories.CATEGORIES, 'Parent categories update:', {
          count: newCategories.length,
          categories: newCategories,
          changes: {
            added: newCategories.filter((cat) => !oldCategories.includes(cat)),
            removed: oldCategories.filter((cat) => !newCategories.includes(cat))
          },
          state: {
            tableId: selectedTableId.value,
            tableName: tableName.value,
            hasSettings: !!settings.value?.namedTables?.[selectedTableId.value]
          }
        })
      },
      { deep: true }
    )

    const unwatchChildCategories = watch(
      () => selectedChildCategories.value,
      (newCategories, oldCategories) => {
        debug.log(DebugCategories.CATEGORIES, 'Child categories update:', {
          count: newCategories.length,
          categories: newCategories,
          changes: {
            added: newCategories.filter((cat) => !oldCategories.includes(cat)),
            removed: oldCategories.filter((cat) => !newCategories.includes(cat))
          },
          state: {
            tableId: selectedTableId.value,
            tableName: tableName.value,
            hasSettings: !!settings.value?.namedTables?.[selectedTableId.value]
          }
        })
      },
      { deep: true }
    )

    // Watch for table changes that affect categories - only for logging
    const unwatchTableCategories = watch(
      () => currentTable.value?.categoryFilters,
      (newFilters) => {
        debug.log(DebugCategories.CATEGORIES, 'Table category filters update:', {
          filters: newFilters,
          state: {
            tableId: selectedTableId.value,
            tableName: tableName.value,
            localCategories: {
              parent: selectedParentCategories.value,
              child: selectedChildCategories.value
            }
          }
        })
      },
      { deep: true }
    )

    // Watch for schedule data changes
    const unwatchScheduleData = watch(
      () => scheduleData.value,
      (newData) => {
        debug.log(DebugCategories.DATA, 'Schedule data update:', {
          count: newData.length,
          hasData: newData.length > 0,
          firstItem: newData[0],
          allItems: newData
        })
      },
      { deep: true }
    )

    // Watch for table data changes
    const unwatchTableData = watch(
      () => tableData.value,
      (newData) => {
        debug.log(DebugCategories.DATA, 'Table data update:', {
          count: newData.length,
          hasData: newData.length > 0,
          firstItem: newData[0],
          allItems: newData
        })
      },
      { deep: true }
    )

    // Watch for column changes
    const unwatchTableColumns = watch(
      () => mergedTableColumns.value,
      (newColumns) => {
        debug.log(DebugCategories.COLUMNS, 'Table columns update:', {
          totalColumns: newColumns.length,
          visibleColumns: newColumns.filter((col) => col.visible).length,
          columns: newColumns.map((col) => ({
            field: col.field,
            header: col.header,
            visible: col.visible,
            category: col.category
          }))
        })
      },
      { deep: true }
    )

    const unwatchDetailColumns = watch(
      () => mergedDetailColumns.value,
      (newColumns) => {
        debug.log(DebugCategories.COLUMNS, 'Detail columns update:', {
          totalColumns: newColumns.length,
          visibleColumns: newColumns.filter((col) => col.visible).length,
          columns: newColumns.map((col) => ({
            field: col.field,
            header: col.header,
            visible: col.visible,
            category: col.category
          }))
        })
      },
      { deep: true }
    )

    // Watch for parameter changes
    const unwatchCustomParameters = watch(
      () => customParameters.value,
      (newParams) => {
        debug.log(DebugCategories.PARAMETERS, 'Custom parameters update:', {
          count: newParams.length,
          parameters: newParams.map((param) => ({
            name: param.name,
            type: param.type,
            field: param.field,
            category: param.category
          }))
        })
      },
      { deep: true }
    )

    const unwatchParameterColumns = watch(
      () => parameterColumns.value,
      (newColumns) => {
        debug.log(DebugCategories.PARAMETERS, 'Parameter columns update:', {
          totalColumns: newColumns.length,
          visibleColumns: newColumns.filter((col) => col.visible).length,
          columns: newColumns.map((col) => ({
            field: col.field,
            header: col.header,
            visible: col.visible,
            category: col.category
          }))
        })
      },
      { deep: true }
    )

    // Watch for evaluated data changes
    const unwatchEvaluatedData = watch(
      () => evaluatedData.value,
      (newData) => {
        debug.log(DebugCategories.DATA_TRANSFORM, 'Evaluated data update:', {
          count: newData.length,
          hasData: newData.length > 0,
          firstItem: newData[0],
          allItems: newData
        })
      },
      { deep: true }
    )

    // Watch for table changes
    const unwatchCurrentTable = watch(
      () => currentTable.value,
      (newTable) => {
        debug.log(DebugCategories.STATE, 'Current table update:', {
          hasTable: !!newTable,
          id: newTable?.id,
          name: newTable?.name,
          parentColumns: newTable?.parentColumns?.length,
          childColumns: newTable?.childColumns?.length,
          customParameters: newTable?.customParameters?.length
        })
      },
      { deep: true }
    )

    const unwatchSelectedTableId = watch(
      () => selectedTableId.value,
      (newId) => {
        debug.log(DebugCategories.STATE, 'Selected table ID update:', {
          id: newId
        })
      }
    )

    // Watch for table name changes
    const unwatchTableName = watch(
      () => tableName.value,
      (newName) => {
        debug.log(DebugCategories.STATE, 'Table name update:', {
          name: newName
        })
      }
    )

    // Watch for errors
    const unwatchLoadingError = watch(
      () => loadingError.value,
      (error) => {
        if (error) {
          debug.error(DebugCategories.ERROR, 'Loading error:', {
            error,
            message: error.message,
            stack: error.stack
          })
        }
      }
    )

    // Watch for UI state changes
    const unwatchCategoryOptions = watch(
      () => showCategoryOptions.value,
      (show) => {
        debug.log(DebugCategories.UI, 'Category options visibility:', {
          visible: show,
          state: {
            selectedParent: selectedParentCategories.value,
            selectedChild: selectedChildCategories.value
          }
        })
      }
    )

    const unwatchParameterManager = watch(
      () => showParameterManager.value,
      (show) => {
        debug.log(DebugCategories.UI, 'Parameter manager visibility:', {
          visible: show
        })
      }
    )

    // Watch for settings changes
    const unwatchSettings = watch(
      () => settings.value,
      (newSettings) => {
        debug.log(DebugCategories.STATE, 'Settings update:', {
          hasSettings: !!newSettings,
          tableCount: Object.keys(newSettings?.namedTables || {}).length,
          tables: Object.entries(newSettings?.namedTables || {}).map(([id, table]) => ({
            id,
            name: table.name,
            parentColumns: table.parentColumns?.length,
            childColumns: table.childColumns?.length,
            customParameters: table.customParameters?.length
          }))
        })
      },
      { deep: true }
    )

    // Watch for table key changes
    const unwatchTableKey = watch(
      () => tableKey.value,
      (newKey) => {
        debug.log(DebugCategories.STATE, 'Table key update:', {
          key: newKey
        })
      }
    )

    // Watch for available headers changes
    const unwatchAvailableHeaders = watch(
      () => availableHeaders.value,
      (newHeaders) => {
        debug.log(DebugCategories.COLUMNS, 'Available headers update:', {
          parentHeaders: {
            count: newHeaders.parent.length,
            headers: newHeaders.parent
          },
          childHeaders: {
            count: newHeaders.child.length,
            headers: newHeaders.child
          }
        })
      },
      { deep: true }
    )

    // Watch for merged parameters changes
    const unwatchMergedParentParameters = watch(
      () => mergedParentParameters.value,
      (newParams) => {
        debug.log(DebugCategories.PARAMETERS, 'Merged parent parameters update:', {
          count: newParams.length,
          parameters: newParams.map((param) => ({
            name: param.name,
            type: param.type,
            field: param.field,
            category: param.category
          }))
        })
      },
      { deep: true }
    )

    const unwatchMergedChildParameters = watch(
      () => mergedChildParameters.value,
      (newParams) => {
        debug.log(DebugCategories.PARAMETERS, 'Merged child parameters update:', {
          count: newParams.length,
          parameters: newParams.map((param) => ({
            name: param.name,
            type: param.type,
            field: param.field,
            category: param.category
          }))
        })
      },
      { deep: true }
    )

    // Cleanup function to stop all watchers
    onCleanup(() => {
      debug.log(DebugCategories.STATE, 'Cleaning up watchers')
      unwatchParentCategories()
      unwatchChildCategories()
      unwatchTableCategories()
      unwatchCategoryOptions()
      unwatchScheduleData()
      unwatchTableData()
      unwatchTableColumns()
      unwatchDetailColumns()
      unwatchCustomParameters()
      unwatchParameterColumns()
      unwatchEvaluatedData()
      unwatchCurrentTable()
      unwatchSelectedTableId()
      unwatchTableName()
      unwatchLoadingError()
      unwatchParameterManager()
      unwatchSettings()
      unwatchTableKey()
      unwatchAvailableHeaders()
      unwatchMergedParentParameters()
      unwatchMergedChildParameters()
      debug.completeState('watcherSetup')
    })
  })

  return {
    stopWatchers
  }
}
