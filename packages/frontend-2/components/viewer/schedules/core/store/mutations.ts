import { type Ref } from 'vue'
import { debug, DebugCategories } from '../../utils/debug'
import type { StoreState, StoreMutations } from '../types'
import type { ElementData, TableRowData } from '../../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'

export function createMutations(state: Ref<StoreState>): StoreMutations {
  // Helper to validate project ID only for data operations
  const validateProjectId = (operation: string): boolean => {
    // Allow state management operations without project ID
    if (
      operation.startsWith('set') &&
      ['setProjectId', 'setInitialized', 'setLoading', 'setError'].includes(operation)
    ) {
      return true
    }

    // Only validate project ID for data operations
    if (!state.value.projectId) {
      debug.warn(DebugCategories.STATE, `Cannot ${operation} without project ID`)
      return false
    }
    return true
  }

  return {
    // Core mutations
    setProjectId: (id: string | null) => {
      debug.log(DebugCategories.STATE, 'Setting project ID:', { id })
      state.value.projectId = id
    },
    setScheduleData: (data: ElementData[]) => {
      if (validateProjectId('set schedule data')) {
        state.value.scheduleData = data
      }
    },
    setEvaluatedData: (data: ElementData[]) => {
      if (validateProjectId('set evaluated data')) {
        state.value.evaluatedData = data
      }
    },
    setTableData: (data: TableRowData[]) => {
      if (validateProjectId('set table data')) {
        state.value.tableData = data
      }
    },

    // Parameter mutations
    setCustomParameters: (params: CustomParameter[]) => {
      if (validateProjectId('set parameters')) {
        state.value.customParameters = params
      }
    },
    setParameterColumns: (columns: ColumnDef[]) => {
      if (validateProjectId('set parameter columns')) {
        state.value.parameterColumns = columns
      }
    },
    setMergedParameters: (parent: CustomParameter[], child: CustomParameter[]) => {
      if (validateProjectId('set merged parameters')) {
        state.value.mergedParentParameters = parent
        state.value.mergedChildParameters = child
      }
    },
    setProcessedParameters: (params: Record<string, unknown>) => {
      if (validateProjectId('set processed parameters')) {
        state.value.processedParameters = params
      }
    },
    setParameterDefinitions: (defs: Record<string, unknown>) => {
      if (validateProjectId('set parameter definitions')) {
        state.value.parameterDefinitions = defs
      }
    },
    setParameterVisibility: (parameterId: string, visible: boolean) => {
      if (validateProjectId('set parameter visibility')) {
        const params = state.value.customParameters.map((p) =>
          p.id === parameterId ? { ...p, visible } : p
        )
        state.value.customParameters = params
      }
    },
    setParameterOrder: (parameterId: string, newIndex: number) => {
      if (validateProjectId('set parameter order')) {
        const params = [...state.value.customParameters]
        const currentIndex = params.findIndex((p) => p.id === parameterId)
        if (currentIndex !== -1) {
          const [param] = params.splice(currentIndex, 1)
          params.splice(newIndex, 0, param)
          state.value.customParameters = params
        }
      }
    },

    // Column mutations
    setCurrentColumns: (table: ColumnDef[], detail: ColumnDef[]) => {
      if (validateProjectId('set current columns')) {
        state.value.currentTableColumns = table
        state.value.currentDetailColumns = detail
      }
    },
    setMergedColumns: (table: ColumnDef[], detail: ColumnDef[]) => {
      if (validateProjectId('set merged columns')) {
        state.value.mergedTableColumns = table
        state.value.mergedDetailColumns = detail
      }
    },
    setColumnVisibility: (columnId: string, visible: boolean) => {
      if (validateProjectId('set column visibility')) {
        const updateColumns = (columns: ColumnDef[]) =>
          columns.map((c) => (c.field === columnId ? { ...c, visible } : c))

        state.value.currentTableColumns = updateColumns(state.value.currentTableColumns)
        state.value.currentDetailColumns = updateColumns(
          state.value.currentDetailColumns
        )
      }
    },
    setColumnOrder: (columnId: string, newIndex: number) => {
      if (validateProjectId('set column order')) {
        const reorderColumns = (columns: ColumnDef[]) => {
          const currentIndex = columns.findIndex((c) => c.field === columnId)
          if (currentIndex !== -1) {
            const newColumns = [...columns]
            const [column] = newColumns.splice(currentIndex, 1)
            newColumns.splice(newIndex, 0, column)
            return newColumns
          }
          return columns
        }

        state.value.currentTableColumns = reorderColumns(
          state.value.currentTableColumns
        )
        state.value.currentDetailColumns = reorderColumns(
          state.value.currentDetailColumns
        )
      }
    },

    // Category mutations
    setSelectedCategories: (categories: Set<string>) => {
      if (validateProjectId('set selected categories')) {
        state.value.selectedCategories = categories
      }
    },
    setParentCategories: (categories: string[]) => {
      if (validateProjectId('set parent categories')) {
        state.value.selectedParentCategories = categories
      }
    },
    setChildCategories: (categories: string[]) => {
      if (validateProjectId('set child categories')) {
        state.value.selectedChildCategories = categories
      }
    },

    // Table mutations
    setTableInfo: (info) => {
      // Allow table info updates without project ID
      state.value.selectedTableId = info.selectedTableId ?? state.value.selectedTableId
      state.value.tableName = info.tableName ?? state.value.tableName
      state.value.currentTableId = info.currentTableId ?? state.value.currentTableId
      state.value.tableKey = info.tableKey ?? state.value.tableKey
    },
    setTablesArray: (tables) => {
      // Allow tables array updates without project ID
      state.value.tablesArray = tables
    },

    // Element mutations
    setElementVisibility: (elementId: string, visible: boolean) => {
      if (validateProjectId('set element visibility')) {
        state.value.scheduleData = state.value.scheduleData.map((element) =>
          'id' in element && element.id === elementId
            ? { ...element, visible }
            : element
        )
      }
    },

    // Header mutations
    setAvailableHeaders: (headers) => {
      if (validateProjectId('set available headers')) {
        state.value.availableHeaders = headers
      }
    },

    // Status mutations
    setInitialized: (value: boolean) => {
      state.value.initialized = value
    },
    setLoading: (value: boolean) => {
      state.value.loading = value
    },
    setError: (err: Error | null) => {
      state.value.error = err
    },

    // Data processing
    processData: async () => {
      if (validateProjectId('process data')) {
        debug.log(DebugCategories.DATA, 'Processing data')
        try {
          await Promise.resolve() // Placeholder for actual processing
        } catch (error) {
          debug.error(DebugCategories.ERROR, 'Data processing failed:', error)
          throw error
        }
      }
    },

    // Reset
    reset: () => {
      debug.log(DebugCategories.STATE, 'Resetting store state')
      state.value = {
        projectId: null,
        scheduleData: [],
        evaluatedData: [],
        tableData: [],
        customParameters: [],
        parameterColumns: [],
        mergedParentParameters: [],
        mergedChildParameters: [],
        processedParameters: {},
        currentTableColumns: [],
        currentDetailColumns: [],
        mergedTableColumns: [],
        mergedDetailColumns: [],
        parameterDefinitions: {},
        availableHeaders: { parent: [], child: [] },
        selectedCategories: new Set(),
        selectedParentCategories: [],
        selectedChildCategories: [],
        tablesArray: [],
        tableName: '',
        selectedTableId: '',
        currentTableId: '',
        tableKey: '',
        initialized: false,
        loading: false,
        error: null
      }
    }
  }
}
