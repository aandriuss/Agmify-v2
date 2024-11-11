import { watch, watchEffect } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { ElementData, TableConfig, AvailableHeaders } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'
import { debug } from '../utils/debug'

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

    // Watch for category state synchronization
    const unwatchCategorySync = watchEffect(() => {
      const currentTableConfig = settings.value?.namedTables?.[selectedTableId.value]
      const settingsParentCategories =
        currentTableConfig?.categoryFilters?.selectedParentCategories || []
      const settingsChildCategories =
        currentTableConfig?.categoryFilters?.selectedChildCategories || []

      // Log any discrepancies between local state and settings
      if (
        JSON.stringify(settingsParentCategories) !==
          JSON.stringify(selectedParentCategories.value) ||
        JSON.stringify(settingsChildCategories) !==
          JSON.stringify(selectedChildCategories.value)
      ) {
        debug.warn('🔍 CATEGORY STATE MISMATCH:', {
          timestamp: new Date().toISOString(),
          local: {
            parent: selectedParentCategories.value,
            child: selectedChildCategories.value
          },
          settings: {
            parent: settingsParentCategories,
            child: settingsChildCategories
          }
        })
      }
    })

    // Enhanced category watchers
    const unwatchParentCategories = watch(
      () => selectedParentCategories.value,
      (newCategories, oldCategories) => {
        debug.log('🔍 PARENT CATEGORIES UPDATE:', {
          timestamp: new Date().toISOString(),
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
        debug.log('🔍 CHILD CATEGORIES UPDATE:', {
          timestamp: new Date().toISOString(),
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

    // Watch for table changes that affect categories
    const unwatchTableCategories = watch(
      () => currentTable.value?.categoryFilters,
      (newFilters) => {
        debug.log('🔍 TABLE CATEGORY FILTERS UPDATE:', {
          timestamp: new Date().toISOString(),
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
        debug.log('🔍 SCHEDULE DATA UPDATE:', {
          timestamp: new Date().toISOString(),
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
        debug.log('🔍 TABLE DATA UPDATE:', {
          timestamp: new Date().toISOString(),
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
        debug.log('🔍 TABLE COLUMNS UPDATE:', {
          timestamp: new Date().toISOString(),
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
        debug.log('🔍 DETAIL COLUMNS UPDATE:', {
          timestamp: new Date().toISOString(),
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
        debug.log('🔍 CUSTOM PARAMETERS UPDATE:', {
          timestamp: new Date().toISOString(),
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
        debug.log('🔍 PARAMETER COLUMNS UPDATE:', {
          timestamp: new Date().toISOString(),
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
        debug.log('🔍 EVALUATED DATA UPDATE:', {
          timestamp: new Date().toISOString(),
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
        debug.log('🔍 CURRENT TABLE UPDATE:', {
          timestamp: new Date().toISOString(),
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
        debug.log('🔍 SELECTED TABLE ID UPDATE:', {
          timestamp: new Date().toISOString(),
          id: newId
        })
      }
    )

    // Watch for table name changes
    const unwatchTableName = watch(
      () => tableName.value,
      (newName) => {
        debug.log('🔍 TABLE NAME UPDATE:', {
          timestamp: new Date().toISOString(),
          name: newName
        })
      }
    )

    // Watch for errors
    const unwatchLoadingError = watch(
      () => loadingError.value,
      (error) => {
        if (error) {
          debug.error('🔥 LOADING ERROR:', {
            timestamp: new Date().toISOString(),
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
        debug.log('🔍 CATEGORY OPTIONS VISIBILITY:', {
          timestamp: new Date().toISOString(),
          visible: show
        })
      }
    )

    const unwatchParameterManager = watch(
      () => showParameterManager.value,
      (show) => {
        debug.log('🔍 PARAMETER MANAGER VISIBILITY:', {
          timestamp: new Date().toISOString(),
          visible: show
        })
      }
    )

    // Watch for settings changes
    const unwatchSettings = watch(
      () => settings.value,
      (newSettings) => {
        debug.log('🔍 SETTINGS UPDATE:', {
          timestamp: new Date().toISOString(),
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
        debug.log('🔍 TABLE KEY UPDATE:', {
          timestamp: new Date().toISOString(),
          key: newKey
        })
      }
    )

    // Watch for available headers changes
    const unwatchAvailableHeaders = watch(
      () => availableHeaders.value,
      (newHeaders) => {
        debug.log('🔍 AVAILABLE HEADERS UPDATE:', {
          timestamp: new Date().toISOString(),
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
        debug.log('🔍 MERGED PARENT PARAMETERS UPDATE:', {
          timestamp: new Date().toISOString(),
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
        debug.log('🔍 MERGED CHILD PARAMETERS UPDATE:', {
          timestamp: new Date().toISOString(),
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
      debug.log('🧹 CLEANING UP WATCHERS')
      unwatchCategorySync()
      unwatchTableCategories()
      unwatchScheduleData()
      unwatchTableData()
      unwatchTableColumns()
      unwatchDetailColumns()
      unwatchCustomParameters()
      unwatchParameterColumns()
      unwatchEvaluatedData()
      unwatchParentCategories()
      unwatchChildCategories()
      unwatchCurrentTable()
      unwatchSelectedTableId()
      unwatchTableName()
      unwatchLoadingError()
      unwatchCategoryOptions()
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
