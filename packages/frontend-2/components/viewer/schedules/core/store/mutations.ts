import { type Ref } from 'vue'
import { debug, DebugCategories } from '../../utils/debug'
import type { StoreState, StoreMutations } from '../types'
import type { ElementData, TableRow, ParameterValue, Parameters } from '../../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'
import {
  defaultColumns,
  defaultDetailColumns,
  defaultTable
} from '../../config/defaultColumns'

function isValidParameterValue(value: unknown): value is ParameterValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
}

export function createMutations(state: Ref<StoreState>): StoreMutations {
  // Helper to convert unknown to ParameterValue
  const toParameterValue = (value: unknown): ParameterValue => {
    if (isValidParameterValue(value)) return value
    return String(value)
  }

  // Helper to create table data
  const createTableData = (
    elements: ElementData[],
    columns: ColumnDef[]
  ): TableRow[] => {
    return elements.map((element) => {
      const parameters: Parameters = {}

      // Add parameters with state
      if (element.parameters) {
        columns.forEach((column) => {
          if (column.field in element.parameters!) {
            const value = toParameterValue(element.parameters![column.field])
            parameters[column.field] = {
              fetchedValue: value,
              currentValue: value,
              previousValue: value,
              userValue: null
            }
          }
        })
      }

      debug.log(DebugCategories.DATA, 'Created table row', {
        elementId: element.id,
        parameterCount: Object.keys(element.parameters || {}).length,
        stateParameterCount: Object.keys(parameters).length
      })

      return {
        id: element.id,
        mark: element.mark,
        category: element.category,
        type: element.type || '',
        parameters,
        _visible: true,
        details: element.details
      }
    })
  }

  return {
    // Core mutations
    setProjectId: (id: string | null) => {
      debug.log(DebugCategories.STATE, 'Setting project ID:', { id })
      state.value.projectId = id
    },
    setScheduleData: (data: ElementData[]) => {
      debug.log(DebugCategories.DATA, 'Setting schedule data', {
        dataLength: data.length
      })
      state.value.scheduleData = data
    },
    setEvaluatedData: (data: ElementData[]) => {
      debug.log(DebugCategories.DATA, 'Setting evaluated data', {
        dataLength: data.length
      })
      state.value.evaluatedData = data
    },
    setTableData: (data: TableRow[]) => {
      debug.log(DebugCategories.DATA, 'Setting table data', {
        dataLength: data.length
      })
      state.value.tableData = data
    },

    // Parameter mutations
    setCustomParameters: (params: CustomParameter[]) => {
      state.value.customParameters = params
    },
    setParameterColumns: (columns: ColumnDef[]) => {
      state.value.parameterColumns = columns
    },
    setMergedParameters: (parent: CustomParameter[], child: CustomParameter[]) => {
      state.value.mergedParentParameters = parent
      state.value.mergedChildParameters = child
    },
    setProcessedParameters: (params: Record<string, unknown>) => {
      state.value.processedParameters = params
    },
    setParameterDefinitions: (defs: Record<string, unknown>) => {
      state.value.parameterDefinitions = defs
    },
    setParameterVisibility: (parameterId: string, visible: boolean) => {
      const params = state.value.customParameters.map((p) =>
        p.id === parameterId ? { ...p, visible } : p
      )
      state.value.customParameters = params
    },
    setParameterOrder: (parameterId: string, newIndex: number) => {
      const params = [...state.value.customParameters]
      const currentIndex = params.findIndex((p) => p.id === parameterId)
      if (currentIndex !== -1) {
        const [param] = params.splice(currentIndex, 1)
        params.splice(newIndex, 0, param)
        state.value.customParameters = params
      }
    },

    // Column mutations
    setCurrentColumns: (table: ColumnDef[], detail: ColumnDef[]) => {
      debug.log(DebugCategories.DATA, 'Setting current columns', {
        tableLength: table.length,
        detailLength: detail.length
      })
      state.value.currentTableColumns = table
      state.value.currentDetailColumns = detail
    },
    setMergedColumns: (table: ColumnDef[], detail: ColumnDef[]) => {
      debug.log(DebugCategories.DATA, 'Setting merged columns', {
        tableLength: table.length,
        detailLength: detail.length
      })
      state.value.mergedTableColumns = table
      state.value.mergedDetailColumns = detail
    },
    setColumnVisibility: (columnId: string, visible: boolean) => {
      const updateColumns = (columns: ColumnDef[]) =>
        columns.map((c) => (c.field === columnId ? { ...c, visible } : c))

      state.value.currentTableColumns = updateColumns(state.value.currentTableColumns)
      state.value.currentDetailColumns = updateColumns(state.value.currentDetailColumns)
    },
    setColumnOrder: (columnId: string, newIndex: number) => {
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

      state.value.currentTableColumns = reorderColumns(state.value.currentTableColumns)
      state.value.currentDetailColumns = reorderColumns(
        state.value.currentDetailColumns
      )
    },

    // Category mutations
    setSelectedCategories: (categories: Set<string>) => {
      state.value.selectedCategories = categories
    },
    setParentCategories: (categories: string[]) => {
      state.value.selectedParentCategories = categories
    },
    setChildCategories: (categories: string[]) => {
      state.value.selectedChildCategories = categories
    },

    // Table mutations
    setTableInfo: (info) => {
      state.value.selectedTableId = info.selectedTableId ?? state.value.selectedTableId
      state.value.tableName = info.tableName ?? state.value.tableName
      state.value.currentTableId = info.currentTableId ?? state.value.currentTableId
      state.value.tableKey = info.tableKey ?? state.value.tableKey
    },
    setTablesArray: (tables) => {
      state.value.tablesArray = tables
    },

    // Element mutations
    setElementVisibility: (elementId: string, visible: boolean) => {
      state.value.scheduleData = state.value.scheduleData.map((element) =>
        'id' in element && element.id === elementId
          ? { ...element, _visible: visible }
          : element
      )
    },

    // Header mutations
    setAvailableHeaders: (headers) => {
      state.value.availableHeaders = headers
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

    setParentParameterColumns: (columns: ColumnDef[]) => {
      state.value.parentParameterColumns = columns
      // Keep backward compatibility
      state.value.parameterColumns = [
        ...columns,
        ...(state.value.childParameterColumns || [])
      ]
    },
    setChildParameterColumns: (columns: ColumnDef[]) => {
      state.value.childParameterColumns = columns
      // Keep backward compatibility
      state.value.parameterColumns = [
        ...(state.value.parentParameterColumns || []),
        ...columns
      ]
    },

    // Data processing
    processData: async () => {
      return new Promise<void>((resolve) => {
        debug.log(DebugCategories.DATA, 'Starting data processing', {
          scheduleDataLength: state.value.scheduleData.length,
          evaluatedDataLength: state.value.evaluatedData.length,
          tableDataLength: state.value.tableData.length,
          parameterColumnsLength: state.value.parameterColumns.length,
          currentTableColumnsLength: state.value.currentTableColumns.length,
          mergedTableColumnsLength: state.value.mergedTableColumns.length
        })

        // Ensure all required data is present
        if (!state.value.scheduleData.length) {
          debug.warn(DebugCategories.DATA, 'No schedule data to process')
          resolve()
          return
        }

        // Step 1: Create table data with current columns
        const allColumns = [
          ...state.value.mergedTableColumns,
          ...state.value.mergedDetailColumns
        ]
        const tableData = createTableData(state.value.scheduleData, allColumns)
        state.value.tableData = tableData

        debug.log(DebugCategories.DATA, 'Table data created', {
          rowCount: tableData.length,
          visibleRows: tableData.filter((row) => row._visible).length,
          firstRow: tableData[0]
        })

        // Step 2: Update processed state
        state.value.initialized = true

        debug.log(DebugCategories.DATA, 'Data processing complete', {
          scheduleDataLength: state.value.scheduleData.length,
          tableDataLength: state.value.tableData.length,
          visibleElements: state.value.scheduleData.filter((el) => el._visible).length
        })

        // Allow state updates to propagate
        setTimeout(resolve, 0)
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
        parentParameterColumns: [],
        childParameterColumns: [],
        mergedParentParameters: [],
        mergedChildParameters: [],
        processedParameters: {},
        // Preserve defaults
        currentTableColumns: [...defaultColumns],
        currentDetailColumns: [...defaultDetailColumns],
        mergedTableColumns: [...defaultColumns],
        mergedDetailColumns: [...defaultDetailColumns],
        parameterDefinitions: {},
        availableHeaders: { parent: [], child: [] },
        selectedCategories: new Set(),
        // Preserve default categories
        selectedParentCategories: [
          ...defaultTable.categoryFilters.selectedParentCategories
        ],
        selectedChildCategories: [
          ...defaultTable.categoryFilters.selectedChildCategories
        ],
        tablesArray: [],
        tableName: defaultTable.name,
        selectedTableId: defaultTable.id,
        currentTableId: defaultTable.id,
        tableKey: '0',
        initialized: false,
        loading: false,
        error: null
      }
    }
  }
}
