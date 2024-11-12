import { computed, ref, watch } from 'vue'
import type { TableConfig } from '../types'
import { debug, DebugCategories } from '../utils/debug'
import type { NamedTableConfig } from '~/composables/useUserSettings'

interface UseScheduleTableOptions {
  settings: { value: { namedTables?: Record<string, TableConfig> } | null }
  updateCategories: (
    parentCategories: string[],
    childCategories: string[]
  ) => Promise<void>
  updateNamedTable: (
    id: string,
    config: Partial<NamedTableConfig>
  ) => Promise<NamedTableConfig>
  isInitialized?: { value: boolean }
}

// Validation function for category state
function validateCategoryState(
  parentCategories: string[],
  childCategories: string[]
): boolean {
  if (!Array.isArray(parentCategories) || !Array.isArray(childCategories)) {
    debug.warn(DebugCategories.VALIDATION, 'Invalid category arrays:', {
      parent: parentCategories,
      child: childCategories
    })
    return false
  }

  const allParentValid = parentCategories.every(
    (cat) => typeof cat === 'string' && cat.length > 0
  )
  const allChildValid = childCategories.every(
    (cat) => typeof cat === 'string' && cat.length > 0
  )

  if (!allParentValid || !allChildValid) {
    debug.warn(DebugCategories.VALIDATION, 'Invalid category values:', {
      invalidParent: parentCategories.filter(
        (cat) => typeof cat !== 'string' || !cat.length
      ),
      invalidChild: childCategories.filter(
        (cat) => typeof cat !== 'string' || !cat.length
      )
    })
    return false
  }

  return true
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
    isInitialized: isInitialized?.value,
    timestamp: new Date().toISOString()
  })

  // State
  const selectedTableId = ref('')
  const tableName = ref('')
  const selectedParentCategories = ref<string[]>([])
  const selectedChildCategories = ref<string[]>([])
  const tableKey = ref(Date.now().toString())
  const loadingError = ref<Error | null>(null)

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

  // Watch for settings changes to update categories
  watch(
    () => settings.value?.namedTables?.[currentTableId.value]?.categoryFilters,
    (newFilters) => {
      debug.log(DebugCategories.CATEGORIES, 'Category filters changed in settings:', {
        filters: newFilters,
        isInitialized: isInitialized?.value,
        timestamp: new Date().toISOString()
      })

      if (newFilters && currentTableId.value) {
        // Update categories from settings
        selectedParentCategories.value = newFilters.selectedParentCategories || []
        selectedChildCategories.value = newFilters.selectedChildCategories || []

        debug.log(DebugCategories.CATEGORIES, 'Updated categories from settings:', {
          parent: selectedParentCategories.value,
          child: selectedChildCategories.value
        })
      }
    },
    { deep: true }
  )

  // Methods
  async function handleTableChange() {
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

          // Get categories from table config or use empty arrays
          const parentCategories =
            selectedTable.categoryFilters?.selectedParentCategories || []
          const childCategories =
            selectedTable.categoryFilters?.selectedChildCategories || []

          // Validate categories before updating
          if (!validateCategoryState(parentCategories, childCategories)) {
            throw new Error('Invalid category state in table config')
          }

          selectedParentCategories.value = parentCategories
          selectedChildCategories.value = childCategories

          debug.log(
            DebugCategories.CATEGORIES,
            'Loading categories from selected table:',
            {
              parent: selectedParentCategories.value,
              child: selectedChildCategories.value
            }
          )

          // Update categories regardless of initialization state
          await updateElementsData(
            selectedParentCategories.value,
            selectedChildCategories.value
          )

          debug.log(DebugCategories.CATEGORIES, 'Categories updated in elements data')

          tableKey.value = Date.now().toString()
        }
      } else {
        // Reset state for new table
        tableName.value = ''
        selectedParentCategories.value = []
        selectedChildCategories.value = []
        await updateElementsData([], [])
      }
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Table change error:', err)
      loadingError.value =
        err instanceof Error ? err : new Error('Failed to handle table change')
      throw loadingError.value
    }
  }

  async function handleTableSelection(tableId: string) {
    debug.log(DebugCategories.TABLE_UPDATES, 'Table selection:', {
      tableId,
      isInitialized: isInitialized?.value,
      timestamp: new Date().toISOString()
    })

    try {
      selectedTableId.value = tableId
      if (!tableId) {
        tableName.value = ''
        selectedParentCategories.value = []
        selectedChildCategories.value = []
        await updateElementsData([], [])
        debug.log(DebugCategories.STATE, 'Reset state for new table')
      } else {
        const selectedTable = settings.value?.namedTables?.[tableId]
        if (selectedTable) {
          tableName.value = selectedTable.name
          // Get categories from table config or use empty arrays
          const parentCategories =
            selectedTable.categoryFilters?.selectedParentCategories || []
          const childCategories =
            selectedTable.categoryFilters?.selectedChildCategories || []

          // Validate categories before updating
          if (!validateCategoryState(parentCategories, childCategories)) {
            throw new Error('Invalid category state in table config')
          }

          selectedParentCategories.value = parentCategories
          selectedChildCategories.value = childCategories

          debug.log(
            DebugCategories.CATEGORIES,
            'Loaded categories from selected table:',
            {
              parent: selectedParentCategories.value,
              child: selectedChildCategories.value
            }
          )

          await updateElementsData(parentCategories, childCategories)
        }
      }

      debug.log(DebugCategories.STATE, 'Selection complete:', {
        selectedId: selectedTableId.value,
        tableName: tableName.value,
        categories: {
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

  async function updateCategories(
    parentCategories: string[],
    childCategories: string[]
  ) {
    debug.log(DebugCategories.CATEGORIES, 'Updating categories:', {
      parent: parentCategories,
      child: childCategories,
      currentTableId: currentTableId.value,
      timestamp: new Date().toISOString()
    })

    try {
      // Validate categories before updating
      if (!validateCategoryState(parentCategories, childCategories)) {
        throw new Error('Invalid category state')
      }

      // First update the data
      await updateElementsData(parentCategories, childCategories)

      debug.log(DebugCategories.CATEGORIES, 'Elements data updated')

      // Then update the current table's category filters if we have a selected table
      if (currentTableId.value) {
        const currentTableConfig = settings.value?.namedTables?.[currentTableId.value]
        if (currentTableConfig) {
          const updatedTableConfig: Partial<NamedTableConfig> = {
            categoryFilters: {
              selectedParentCategories: parentCategories,
              selectedChildCategories: childCategories
            }
          }

          // Save to PostgreSQL
          await updateNamedTable(currentTableId.value, updatedTableConfig)
          debug.log(DebugCategories.CATEGORIES, 'Categories saved to database')
        }
      }

      debug.log(DebugCategories.CATEGORIES, 'Categories update complete')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Update error:', err)
      loadingError.value =
        err instanceof Error ? err : new Error('Failed to update categories')
      throw loadingError.value
    }
  }

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
    tablesArray: computed(() =>
      Object.entries(settings.value?.namedTables || {}).map(([id, table]) => ({
        id,
        name: table.name
      }))
    ),
    handleTableChange,
    handleTableSelection,
    updateCategories
  }
}
