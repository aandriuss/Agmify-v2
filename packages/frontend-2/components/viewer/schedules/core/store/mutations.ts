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

  // Helper to ensure atomic updates
  const atomicUpdate = <T>(operation: string, update: () => T): T | undefined => {
    if (!validateProjectId(operation)) return

    try {
      state.value.loading = true
      const result = update()
      return result
    } catch (error) {
      debug.error(DebugCategories.ERROR, `${operation} failed:`, error)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  return {
    // Core mutations
    setProjectId: (id: string | null) => {
      debug.log(DebugCategories.STATE, 'Setting project ID:', { id })
      state.value.projectId = id
    },
    setScheduleData: (data: ElementData[]) => {
      atomicUpdate('set schedule data', () => {
        state.value.scheduleData = data
      })
    },
    setEvaluatedData: (data: ElementData[]) => {
      atomicUpdate('set evaluated data', () => {
        state.value.evaluatedData = data
      })
    },
    setTableData: (data: TableRowData[]) => {
      atomicUpdate('set table data', () => {
        state.value.tableData = data
      })
    },

    // Parameter mutations
    setCustomParameters: (params: CustomParameter[]) => {
      atomicUpdate('set parameters', () => {
        state.value.customParameters = params
      })
    },
    setParameterColumns: (columns: ColumnDef[]) => {
      atomicUpdate('set parameter columns', () => {
        state.value.parameterColumns = columns
      })
    },
    setMergedParameters: (parent: CustomParameter[], child: CustomParameter[]) => {
      atomicUpdate('set merged parameters', () => {
        state.value.mergedParentParameters = parent
        state.value.mergedChildParameters = child
      })
    },
    setProcessedParameters: (params: Record<string, unknown>) => {
      atomicUpdate('set processed parameters', () => {
        state.value.processedParameters = params
      })
    },
    setParameterDefinitions: (defs: Record<string, unknown>) => {
      atomicUpdate('set parameter definitions', () => {
        state.value.parameterDefinitions = defs
      })
    },
    setParameterVisibility: (parameterId: string, visible: boolean) => {
      atomicUpdate('set parameter visibility', () => {
        const params = state.value.customParameters.map((p) =>
          p.id === parameterId ? { ...p, visible } : p
        )
        state.value.customParameters = params
      })
    },
    setParameterOrder: (parameterId: string, newIndex: number) => {
      atomicUpdate('set parameter order', () => {
        const params = [...state.value.customParameters]
        const currentIndex = params.findIndex((p) => p.id === parameterId)
        if (currentIndex !== -1) {
          const [param] = params.splice(currentIndex, 1)
          params.splice(newIndex, 0, param)
          state.value.customParameters = params
        }
      })
    },

    // Column mutations
    setCurrentColumns: (table: ColumnDef[], detail: ColumnDef[]) => {
      atomicUpdate('set current columns', () => {
        state.value.currentTableColumns = table
        state.value.currentDetailColumns = detail
      })
    },
    setMergedColumns: (table: ColumnDef[], detail: ColumnDef[]) => {
      atomicUpdate('set merged columns', () => {
        state.value.mergedTableColumns = table
        state.value.mergedDetailColumns = detail
      })
    },
    setColumnVisibility: (columnId: string, visible: boolean) => {
      atomicUpdate('set column visibility', () => {
        const updateColumns = (columns: ColumnDef[]) =>
          columns.map((c) => (c.field === columnId ? { ...c, visible } : c))

        state.value.currentTableColumns = updateColumns(state.value.currentTableColumns)
        state.value.currentDetailColumns = updateColumns(
          state.value.currentDetailColumns
        )
      })
    },
    setColumnOrder: (columnId: string, newIndex: number) => {
      atomicUpdate('set column order', () => {
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
      })
    },

    // Category mutations
    setSelectedCategories: (categories: Set<string>) => {
      atomicUpdate('set selected categories', () => {
        state.value.selectedCategories = categories
      })
    },
    setParentCategories: (categories: string[]) => {
      atomicUpdate('set parent categories', () => {
        state.value.selectedParentCategories = categories
      })
    },
    setChildCategories: (categories: string[]) => {
      atomicUpdate('set child categories', () => {
        state.value.selectedChildCategories = categories
      })
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
      atomicUpdate('set element visibility', () => {
        state.value.scheduleData = state.value.scheduleData.map((element) =>
          'id' in element && element.id === elementId
            ? { ...element, _visible: visible }
            : element
        )
      })
    },

    // Header mutations
    setAvailableHeaders: (headers) => {
      atomicUpdate('set available headers', () => {
        state.value.availableHeaders = headers
      })
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
      await atomicUpdate('process data', () => {
        debug.log(DebugCategories.DATA, 'Processing data', {
          scheduleDataLength: state.value.scheduleData.length,
          evaluatedDataLength: state.value.evaluatedData.length,
          tableDataLength: state.value.tableData.length,
          parameterColumnsLength: state.value.parameterColumns.length
        })

        // Ensure all required data is present
        if (!state.value.scheduleData.length) {
          debug.warn(DebugCategories.DATA, 'No schedule data to process')
          return
        }

        // Set visibility flags for all elements
        state.value.scheduleData = state.value.scheduleData.map((element) => ({
          ...element,
          _visible: true
        }))

        // Process parameters if needed
        if (state.value.customParameters.length > 0) {
          debug.log(DebugCategories.DATA, 'Processing parameters', {
            customParametersLength: state.value.customParameters.length
          })
          // Parameter processing logic would go here
        }

        // Update processed state
        state.value.initialized = true

        debug.log(DebugCategories.DATA, 'Data processing complete', {
          scheduleDataLength: state.value.scheduleData.length,
          visibleElements: state.value.scheduleData.filter((el) => el._visible).length
        })
      })
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
