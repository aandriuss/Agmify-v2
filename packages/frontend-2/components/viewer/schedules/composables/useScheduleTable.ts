import { computed, ref, type Ref } from 'vue'
import { debug, DebugCategories } from '../utils/debug'
import type { NamedTableConfig } from '~/composables/useUserSettings'
import { useScheduleCategories } from './useScheduleCategories'

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
  isInitialized?: Ref<boolean>
}

export function useScheduleTable(options: UseScheduleTableOptions) {
  const {
    settings,
    updateCategories: updateElementsData,
    updateNamedTable,
    isInitialized
  } = options

  debug.log(DebugCategories.INITIALIZATION, 'Initializing table management:', {
    hasSettings: !!settings.value,
    hasNamedTables: !!settings.value?.namedTables,
    namedTablesCount: Object.keys(settings.value?.namedTables || {}).length,
    namedTables: settings.value?.namedTables,
    isInitialized: isInitialized?.value,
    timestamp: new Date().toISOString()
  })

  // State
  const selectedTableId = ref('')
  const tableName = ref('')
  const tableKey = ref(Date.now().toString())
  const loadingError = ref<Error | null>(null)

  // Use schedule categories composable for category management
  const {
    selectedParentCategories,
    selectedChildCategories,
    setCategories,
    toggleCategory
  } = useScheduleCategories({
    updateCategories: async (parent, child) => {
      debug.log(DebugCategories.CATEGORIES, 'Saving category selections:', {
        parent,
        child,
        selectedTableId: selectedTableId.value
      })

      try {
        // First update elements data
        await updateElementsData(parent, child)

        // Then save to PostgreSQL if we have a selected table
        if (selectedTableId.value) {
          const currentTableConfig =
            settings.value?.namedTables?.[selectedTableId.value]
          if (currentTableConfig) {
            // Create a new table config with only the updated category filters
            const updatedConfig: Partial<NamedTableConfig> = {
              categoryFilters: {
                selectedParentCategories: parent,
                selectedChildCategories: child
              }
            }

            // Save to PostgreSQL
            await updateNamedTable(selectedTableId.value, updatedConfig)
            debug.log(
              DebugCategories.CATEGORIES,
              'Category selections saved to PostgreSQL'
            )
          }
        }
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to save category selections:', err)
        throw err
      }
    },
    isInitialized
  })

  // Computed
  const currentTableId = computed(() => selectedTableId.value)

  const currentTable = computed(() => {
    const table = settings.value?.namedTables?.[currentTableId.value]
    if (!table) {
      debug.log(DebugCategories.STATE, 'No table selected')
      return null
    }

    debug.log(DebugCategories.STATE, 'Using existing table:', {
      id: table.id,
      name: table.name,
      categories: table.categoryFilters
    })
    return table
  })

  // Methods
  function handleTableChange() {
    debug.log(DebugCategories.TABLE_UPDATES, 'Table change triggered:', {
      selectedId: selectedTableId.value,
      isInitialized: isInitialized?.value,
      timestamp: new Date().toISOString()
    })

    try {
      if (selectedTableId.value) {
        const selectedTable = settings.value?.namedTables?.[selectedTableId.value]
        if (selectedTable) {
          tableName.value = selectedTable.name

          // Load saved category selections from PostgreSQL
          const savedParentCategories =
            selectedTable.categoryFilters?.selectedParentCategories || []
          const savedChildCategories =
            selectedTable.categoryFilters?.selectedChildCategories || []

          // Update category selections (local state only)
          setCategories(savedParentCategories, savedChildCategories)

          debug.log(DebugCategories.CATEGORIES, 'Loaded category selections:', {
            parent: savedParentCategories,
            child: savedChildCategories
          })

          tableKey.value = Date.now().toString()
        }
      } else {
        // Reset to empty selections for new table
        setCategories([], [])
      }
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Table change error:', err)
      loadingError.value =
        err instanceof Error ? err : new Error('Failed to handle table change')
      throw loadingError.value
    }
  }

  function handleTableSelection(tableId: string) {
    debug.log(DebugCategories.TABLE_UPDATES, 'Table selection:', {
      tableId,
      isInitialized: isInitialized?.value,
      timestamp: new Date().toISOString()
    })

    try {
      selectedTableId.value = tableId
      if (!tableId) {
        tableName.value = ''
        // Reset to empty selections
        setCategories([], [])
        debug.log(DebugCategories.STATE, 'Reset to empty selections')
      } else {
        const selectedTable = settings.value?.namedTables?.[tableId]
        if (selectedTable) {
          tableName.value = selectedTable.name

          // Load saved category selections from PostgreSQL
          const savedParentCategories =
            selectedTable.categoryFilters?.selectedParentCategories || []
          const savedChildCategories =
            selectedTable.categoryFilters?.selectedChildCategories || []

          // Update category selections (local state only)
          setCategories(savedParentCategories, savedChildCategories)

          debug.log(DebugCategories.CATEGORIES, 'Loaded category selections:', {
            parent: savedParentCategories,
            child: savedChildCategories
          })
        }
      }

      debug.log(DebugCategories.STATE, 'Selection complete:', {
        selectedId: selectedTableId.value,
        tableName: tableName.value,
        selections: {
          parent: selectedParentCategories.value,
          child: selectedChildCategories.value
        }
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Selection error:', err)
      loadingError.value =
        err instanceof Error ? err : new Error('Failed to handle table selection')
      throw loadingError.value
    }
  }

  // Computed for tables array
  const tablesArray = computed(() => {
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
    loadingError,
    currentTableId,
    currentTable,
    currentTableColumns: computed(() => currentTable.value?.parentColumns || []),
    currentDetailColumns: computed(() => currentTable.value?.childColumns || []),
    tablesArray,
    handleTableChange,
    handleTableSelection,
    toggleCategory
  }
}
