import { computed, ref, watch, type Ref, type ComputedRef } from 'vue'
import { debug, DebugCategories } from '../debug/useDebug'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { NamedTableConfig } from '~/composables/useUserSettings'
import {
  defaultColumns,
  defaultDetailColumns,
  defaultTable
} from '../config/defaultColumns'
import { useUpdateQueue } from '~/composables/settings/useUpdateQueue'

interface UseScheduleTableOptions {
  settings: { value: { namedTables?: Record<string, NamedTableConfig> } | null }
  updateCategories: (
    parentCategories: string[],
    childCategories: string[]
  ) => Promise<void>
  updateNamedTable: (
    id: string,
    config: Partial<NamedTableConfig>
  ) => Promise<NamedTableConfig>
  createNamedTable?: (
    name: string,
    config: Omit<NamedTableConfig, 'id' | 'name'>
  ) => Promise<NamedTableConfig>
  handleError: (error: unknown) => void
  updateCurrentColumns: (tableColumns: ColumnDef[], detailColumns: ColumnDef[]) => void
}

interface UseScheduleTableReturn {
  selectedTableId: Ref<string>
  tableName: Ref<string>
  selectedParentCategories: Ref<string[]>
  selectedChildCategories: Ref<string[]>
  tableKey: Ref<string>
  isLoading: Ref<boolean>
  isTableUpdatePending: Ref<boolean>
  hasChanges: ComputedRef<boolean>
  currentTableId: ComputedRef<string>
  currentTable: ComputedRef<NamedTableConfig | null>
  tablesArray: ComputedRef<Array<{ id: string; name: string }>>
  handleTableChange: () => void
  handleTableSelection: (tableId: string) => void
  handleSaveTable: () => Promise<void>
  handleBothColumnsUpdate: (updates: {
    parentColumns: ColumnDef[]
    childColumns: ColumnDef[]
  }) => void
  toggleCategory: (type: 'parent' | 'child', category: string) => void
}

export function useScheduleTable(
  options: UseScheduleTableOptions
): UseScheduleTableReturn {
  const {
    settings,
    updateCategories: updateElementsData,
    updateNamedTable,
    createNamedTable,
    handleError,
    updateCurrentColumns
  } = options

  const { clearQueue } = useUpdateQueue()

  // State
  const selectedTableId = ref<string>('')
  const tableName = ref<string>('')
  const tableKey = ref<string>(Date.now().toString())
  const isLoading = ref<boolean>(false)
  const isTableUpdatePending = ref<boolean>(false)

  // Category state - initialize with defaults
  const selectedParentCategories = ref<string[]>(
    defaultTable.categoryFilters.selectedParentCategories
  )
  const selectedChildCategories = ref<string[]>(
    defaultTable.categoryFilters.selectedChildCategories
  )

  // Column state - initialize with defaults
  const currentParentColumns = ref<ColumnDef[]>(defaultColumns)
  const currentChildColumns = ref<ColumnDef[]>(defaultDetailColumns)

  // Original state for tracking changes
  const originalParentCategories = ref<string[]>(
    defaultTable.categoryFilters.selectedParentCategories
  )
  const originalChildCategories = ref<string[]>(
    defaultTable.categoryFilters.selectedChildCategories
  )

  // Watch for settings changes
  watch(
    () => settings.value?.namedTables?.[selectedTableId.value],
    (newTable) => {
      if (!newTable || !selectedTableId.value) return

      // Update category state from settings
      const savedParentCategories =
        newTable.categoryFilters?.selectedParentCategories || []
      const savedChildCategories =
        newTable.categoryFilters?.selectedChildCategories || []

      // Only update if different from current state
      if (
        JSON.stringify(savedParentCategories) !==
          JSON.stringify(selectedParentCategories.value) ||
        JSON.stringify(savedChildCategories) !==
          JSON.stringify(selectedChildCategories.value)
      ) {
        debug.log(
          DebugCategories.CATEGORIES,
          'Settings changed, updating categories:',
          {
            parent: savedParentCategories,
            child: savedChildCategories
          }
        )

        selectedParentCategories.value = [...savedParentCategories]
        selectedChildCategories.value = [...savedChildCategories]
        originalParentCategories.value = [...savedParentCategories]
        originalChildCategories.value = [...savedChildCategories]

        // Update elements data with new categories
        updateElementsData(savedParentCategories, savedChildCategories).catch(
          handleError
        )
      }
    },
    { deep: true }
  )

  // Computed
  const currentTableId = computed<string>(() => selectedTableId.value)

  const currentTable = computed<NamedTableConfig | null>(() => {
    if (!settings.value?.namedTables) {
      debug.log(DebugCategories.STATE, 'Settings not available')
      return null
    }

    const table = settings.value.namedTables[currentTableId.value]
    if (!table) {
      debug.log(DebugCategories.STATE, 'No table selected')
      return null
    }

    debug.log(DebugCategories.STATE, 'Using existing table:', {
      id: table.id,
      name: table.name,
      categories: table.categoryFilters,
      columns: {
        parent: table.parentColumns?.length || 0,
        child: table.childColumns?.length || 0
      }
    })
    return table
  })

  // Track changes by comparing with original state
  const hasChanges = computed<boolean>(() => {
    const parentDiff =
      selectedParentCategories.value.length !== originalParentCategories.value.length ||
      selectedParentCategories.value.some(
        (cat) => !originalParentCategories.value.includes(cat)
      )

    const childDiff =
      selectedChildCategories.value.length !== originalChildCategories.value.length ||
      selectedChildCategories.value.some(
        (cat) => !originalChildCategories.value.includes(cat)
      )

    return parentDiff || childDiff
  })

  function toggleCategory(type: 'parent' | 'child', category: string) {
    try {
      debug.log(DebugCategories.CATEGORIES, 'Category toggle requested', {
        type,
        category,
        currentState: {
          parent: selectedParentCategories.value,
          child: selectedChildCategories.value
        }
      })

      // Update local state
      if (type === 'parent') {
        const index = selectedParentCategories.value.indexOf(category)
        if (index === -1) {
          selectedParentCategories.value = [...selectedParentCategories.value, category]
        } else {
          selectedParentCategories.value = selectedParentCategories.value.filter(
            (cat) => cat !== category
          )
        }
      } else {
        const index = selectedChildCategories.value.indexOf(category)
        if (index === -1) {
          selectedChildCategories.value = [...selectedChildCategories.value, category]
        } else {
          selectedChildCategories.value = selectedChildCategories.value.filter(
            (cat) => cat !== category
          )
        }
      }

      // Update elements data with current categories
      updateElementsData(
        selectedParentCategories.value,
        selectedChildCategories.value
      ).catch(handleError)

      debug.log(DebugCategories.CATEGORIES, 'Category toggle completed', {
        newState: {
          parent: selectedParentCategories.value,
          child: selectedChildCategories.value
        }
      })
    } catch (err) {
      handleError(err)
    }
  }

  async function handleTableChange() {
    if (isLoading.value || isTableUpdatePending.value) {
      debug.warn(DebugCategories.STATE, 'Update already in progress')
      return
    }

    debug.log(DebugCategories.TABLE_UPDATES, 'Table change triggered:', {
      selectedId: selectedTableId.value,
      timestamp: new Date().toISOString()
    })

    try {
      isLoading.value = true
      clearQueue() // Clear any pending updates

      if (selectedTableId.value) {
        const selectedTable = settings.value?.namedTables?.[selectedTableId.value]
        if (!selectedTable) {
          throw new Error('Selected table not found in settings')
        }

        tableName.value = selectedTable.name

        // Use default columns if PostgreSQL has empty arrays
        const parentColumns = selectedTable.parentColumns?.length
          ? selectedTable.parentColumns
          : defaultColumns
        const childColumns = selectedTable.childColumns?.length
          ? selectedTable.childColumns
          : defaultDetailColumns

        debug.log(DebugCategories.COLUMNS, 'Setting columns:', {
          parent: {
            fromDB: selectedTable.parentColumns?.length || 0,
            using: parentColumns.length,
            usingDefaults: !selectedTable.parentColumns?.length
          },
          child: {
            fromDB: selectedTable.childColumns?.length || 0,
            using: childColumns.length,
            usingDefaults: !selectedTable.childColumns?.length
          }
        })

        currentParentColumns.value = parentColumns
        currentChildColumns.value = childColumns
        updateCurrentColumns(parentColumns, childColumns)

        // Load saved category selections from PostgreSQL
        const savedParentCategories =
          selectedTable.categoryFilters?.selectedParentCategories || []
        const savedChildCategories =
          selectedTable.categoryFilters?.selectedChildCategories || []

        debug.log(DebugCategories.CATEGORIES, 'Loading saved category selections:', {
          parent: savedParentCategories,
          child: savedChildCategories
        })

        // Update category state
        selectedParentCategories.value = [...savedParentCategories]
        selectedChildCategories.value = [...savedChildCategories]

        // Update original state
        originalParentCategories.value = [...savedParentCategories]
        originalChildCategories.value = [...savedChildCategories]

        // Update elements data with loaded categories
        await updateElementsData(savedParentCategories, savedChildCategories)

        debug.log(DebugCategories.CATEGORIES, 'Category selections loaded successfully')

        // Update table key after categories are loaded
        tableKey.value = Date.now().toString()
      } else {
        // When no table is selected (Create New), use defaults
        tableName.value = ''
        currentParentColumns.value = defaultColumns
        currentChildColumns.value = defaultDetailColumns
        updateCurrentColumns(defaultColumns, defaultDetailColumns)

        // Use default categories instead of empty arrays
        selectedParentCategories.value = [
          ...defaultTable.categoryFilters.selectedParentCategories
        ]
        selectedChildCategories.value = [
          ...defaultTable.categoryFilters.selectedChildCategories
        ]
        originalParentCategories.value = [
          ...defaultTable.categoryFilters.selectedParentCategories
        ]
        originalChildCategories.value = [
          ...defaultTable.categoryFilters.selectedChildCategories
        ]

        // Update elements data with default categories
        await updateElementsData(
          defaultTable.categoryFilters.selectedParentCategories,
          defaultTable.categoryFilters.selectedChildCategories
        )
        debug.log(
          DebugCategories.CATEGORIES,
          'Reset to defaults - using default categories'
        )
      }
    } catch (err) {
      handleError(err)
    } finally {
      isLoading.value = false
    }
  }

  function handleTableSelection(tableId: string) {
    try {
      debug.log(DebugCategories.TABLE_UPDATES, 'Table selection:', {
        tableId
      })

      selectedTableId.value = tableId
      handleTableChange()
    } catch (err) {
      handleError(err)
    }
  }

  async function handleSaveTable() {
    try {
      debug.log(DebugCategories.TABLE_UPDATES, 'Save table requested', {
        selectedId: selectedTableId.value,
        tableName: tableName.value,
        currentState: {
          parent: selectedParentCategories.value,
          child: selectedChildCategories.value,
          columns: {
            parent: currentParentColumns.value.length,
            child: currentChildColumns.value.length
          }
        }
      })

      // Validate table name
      if (!tableName.value) {
        throw new Error('Table name is required')
      }

      isTableUpdatePending.value = true
      clearQueue() // Clear any pending updates

      // Create initial config with current category selections and columns
      const config = {
        name: tableName.value,
        parentColumns: currentParentColumns.value,
        childColumns: currentChildColumns.value,
        categoryFilters: {
          selectedParentCategories: selectedParentCategories.value,
          selectedChildCategories: selectedChildCategories.value
        },
        customParameters: []
      }

      // Create new table or update existing one
      if (!selectedTableId.value) {
        // Create new table with current category selections
        if (!createNamedTable) {
          throw new Error('createNamedTable function not provided')
        }
        const newTable = await createNamedTable(tableName.value, config)
        debug.log(DebugCategories.TABLE_UPDATES, 'New table created', {
          id: newTable.id,
          config
        })
        // Update selectedTableId and trigger table change
        selectedTableId.value = newTable.id
        await handleTableChange()
      } else {
        // Update existing table
        await updateNamedTable(selectedTableId.value, config)
        debug.log(DebugCategories.TABLE_UPDATES, 'Table updated', {
          id: selectedTableId.value,
          config
        })
      }

      // Update original state to match current state
      originalParentCategories.value = [...selectedParentCategories.value]
      originalChildCategories.value = [...selectedChildCategories.value]

      // Update elements data with current categories
      await updateElementsData(
        selectedParentCategories.value,
        selectedChildCategories.value
      )

      // Force table key update to trigger re-render
      tableKey.value = Date.now().toString()
    } catch (err) {
      handleError(err)
    } finally {
      isTableUpdatePending.value = false
    }
  }

  function handleBothColumnsUpdate(updates: {
    parentColumns: ColumnDef[]
    childColumns: ColumnDef[]
  }) {
    debug.log(DebugCategories.COLUMNS, 'Both columns update requested', updates)
    currentParentColumns.value = updates.parentColumns
    currentChildColumns.value = updates.childColumns
    updateCurrentColumns(updates.parentColumns, updates.childColumns)
  }

  // Computed for tables array
  const tablesArray = computed<Array<{ id: string; name: string }>>(() => {
    const tables = settings.value?.namedTables || {}
    const result = Object.entries(tables).map(([id, table]) => ({
      id,
      name: table.name
    }))
    debug.log(DebugCategories.STATE, 'Tables array updated:', {
      count: result.length,
      tables: result
    })
    return result
  })

  return {
    selectedTableId,
    tableName,
    selectedParentCategories,
    selectedChildCategories,
    tableKey,
    isLoading,
    isTableUpdatePending,
    hasChanges,
    currentTableId,
    currentTable,
    tablesArray,
    handleTableChange,
    handleTableSelection,
    handleSaveTable,
    handleBothColumnsUpdate,
    toggleCategory
  }
}
