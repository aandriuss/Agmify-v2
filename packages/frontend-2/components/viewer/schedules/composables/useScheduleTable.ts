import { computed, ref } from 'vue'
import { debug, DebugCategories } from '../utils/debug'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { NamedTableConfig } from '~/composables/useUserSettings'
import {
  useScheduleCategories,
  type UseScheduleCategoriesReturn
} from './useScheduleCategories'

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

export function useScheduleTable(options: UseScheduleTableOptions) {
  const {
    settings,
    updateCategories: updateElementsData,
    updateNamedTable,
    createNamedTable,
    handleError,
    updateCurrentColumns
  } = options

  // State
  const selectedTableId = ref('')
  const tableName = ref('')
  const tableKey = ref(Date.now().toString())
  const isLoading = ref(false)
  const isTableUpdatePending = ref(false)

  // Original state for tracking changes
  const originalParentCategories = ref<string[]>([])
  const originalChildCategories = ref<string[]>([])

  // Use schedule categories composable for category management
  const {
    selectedParentCategories,
    selectedChildCategories,
    isUpdating: isCategoryUpdatePending,
    toggleCategory: toggleCategoryInternal,
    loadCategories,
    saveCategories
  }: UseScheduleCategoriesReturn = useScheduleCategories({
    updateCategories: async (parent: string[], child: string[]) => {
      debug.log(DebugCategories.CATEGORIES, 'Saving category selections:', {
        parent,
        child,
        selectedTableId: selectedTableId.value
      })

      try {
        // Always update elements data first
        await updateElementsData(parent, child)

        // Save to PostgreSQL if we have a selected table
        if (selectedTableId.value) {
          const currentTableConfig =
            settings.value?.namedTables?.[selectedTableId.value]
          if (currentTableConfig) {
            isTableUpdatePending.value = true
            // Create a new table config with only the updated category filters
            const updatedConfig: Partial<NamedTableConfig> = {
              ...currentTableConfig,
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

            // Update original state after successful save
            originalParentCategories.value = [...parent]
            originalChildCategories.value = [...child]
          }
        }
      } catch (err) {
        handleError(err)
        throw err
      } finally {
        isTableUpdatePending.value = false
      }
    }
  })

  // Computed
  const currentTableId = computed(() => selectedTableId.value)

  const currentTable = computed(() => {
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
      categories: table.categoryFilters
    })
    return table
  })

  // Track changes by comparing with original state
  const hasChanges = computed(() => {
    const parentDiff =
      selectedParentCategories.value.length !== originalParentCategories.value.length ||
      selectedParentCategories.value.some(
        (cat: string) => !originalParentCategories.value.includes(cat)
      )

    const childDiff =
      selectedChildCategories.value.length !== originalChildCategories.value.length ||
      selectedChildCategories.value.some(
        (cat: string) => !originalChildCategories.value.includes(cat)
      )

    return parentDiff || childDiff
  })

  function handleTableChange() {
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

      if (selectedTableId.value) {
        const selectedTable = settings.value?.namedTables?.[selectedTableId.value]
        if (!selectedTable) {
          throw new Error('Selected table not found in settings')
        }

        tableName.value = selectedTable.name

        // Load saved category selections from PostgreSQL
        const savedParentCategories =
          selectedTable.categoryFilters?.selectedParentCategories || []
        const savedChildCategories =
          selectedTable.categoryFilters?.selectedChildCategories || []

        debug.log(DebugCategories.CATEGORIES, 'Loading saved category selections:', {
          parent: savedParentCategories,
          child: savedChildCategories
        })

        // Load saved categories
        loadCategories(savedParentCategories, savedChildCategories)

        // Update original state
        originalParentCategories.value = [...savedParentCategories]
        originalChildCategories.value = [...savedChildCategories]

        debug.log(DebugCategories.CATEGORIES, 'Category selections loaded successfully')

        // Update table key after categories are loaded
        tableKey.value = Date.now().toString()
      } else {
        // When no table is selected, reset categories
        tableName.value = ''
        loadCategories([], [])
        originalParentCategories.value = []
        originalChildCategories.value = []
        debug.log(DebugCategories.CATEGORIES, 'Categories reset - no table selected')
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
          child: selectedChildCategories.value
        }
      })

      // Validate table name
      if (!tableName.value) {
        throw new Error('Table name is required')
      }

      isTableUpdatePending.value = true

      // Create initial config with current category selections
      const config = {
        name: tableName.value,
        parentColumns: [],
        childColumns: [],
        categoryFilters: {
          selectedParentCategories: [...selectedParentCategories.value],
          selectedChildCategories: [...selectedChildCategories.value]
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
        selectedTableId.value = newTable.id
        debug.log(DebugCategories.TABLE_UPDATES, 'New table created with categories', {
          id: newTable.id,
          categories: config.categoryFilters
        })
      } else {
        // Update existing table
        await updateNamedTable(selectedTableId.value, config)
        debug.log(DebugCategories.TABLE_UPDATES, 'Table updated with categories', {
          id: selectedTableId.value,
          categories: config.categoryFilters
        })
      }

      // Save categories and update original state
      await saveCategories()
      originalParentCategories.value = [...selectedParentCategories.value]
      originalChildCategories.value = [...selectedChildCategories.value]
    } catch (err) {
      handleError(err)
    } finally {
      isTableUpdatePending.value = false
    }
  }

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

      // Just update local state - persistence happens on save
      toggleCategoryInternal(type, category)

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

  function handleBothColumnsUpdate(updates: {
    parentColumns: ColumnDef[]
    childColumns: ColumnDef[]
  }) {
    debug.log(DebugCategories.COLUMNS, 'Both columns update requested', updates)
    updateCurrentColumns(updates.parentColumns, updates.childColumns)
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
    isLoading,
    isTableUpdatePending,
    isCategoryUpdatePending,
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
