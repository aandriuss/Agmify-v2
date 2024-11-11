import { computed, ref, watch } from 'vue'
import type { TableConfig } from '../types'
import { defaultParentColumns, defaultChildColumns } from '../config/defaultColumns'
import { DEFAULT_TABLE_ID, DEFAULT_TABLE_NAME } from '../config/constants'
import { debug } from '../utils/debug'

interface UseScheduleTableOptions {
  settings: { value: { namedTables?: Record<string, TableConfig> } | null }
  updateCategories: (
    parentCategories: string[],
    childCategories: string[]
  ) => Promise<void>
  isInitialized?: { value: boolean }
}

// Validation function for category state
function validateCategoryState(
  parentCategories: string[],
  childCategories: string[]
): boolean {
  if (!Array.isArray(parentCategories) || !Array.isArray(childCategories)) {
    debug.warn('[Table] Invalid category arrays:', {
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
    debug.warn('[Table] Invalid category values:', {
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
  const { settings, updateCategories: updateElementsData, isInitialized } = options

  debug.log('[Table] Initializing with options:', {
    hasSettings: !!settings.value,
    isInitialized: isInitialized?.value,
    timestamp: new Date().toISOString()
  })

  // State
  const selectedTableId = ref(DEFAULT_TABLE_ID)
  const tableName = ref(DEFAULT_TABLE_NAME)
  const selectedParentCategories = ref<string[]>([])
  const selectedChildCategories = ref<string[]>([])
  const tableKey = ref(Date.now().toString())
  const loadingError = ref<Error | null>(null)

  // Computed
  const currentTableId = computed(() => selectedTableId.value)

  const currentTable = computed(() => {
    const table = settings.value?.namedTables?.[currentTableId.value]
    if (!table) {
      debug.log('[Table] Creating default table:', {
        id: DEFAULT_TABLE_ID,
        name: DEFAULT_TABLE_NAME,
        timestamp: new Date().toISOString()
      })

      // Start with empty categories
      selectedParentCategories.value = []
      selectedChildCategories.value = []

      debug.log('[Table] Default table categories:', {
        parent: selectedParentCategories.value,
        child: selectedChildCategories.value
      })

      return {
        id: DEFAULT_TABLE_ID,
        name: DEFAULT_TABLE_NAME,
        parentColumns: defaultParentColumns.map((col) => ({
          ...col,
          visible: true,
          type: col.type || 'string',
          order: col.order || 0,
          removable: true,
          category: col.category || 'Default'
        })),
        childColumns: defaultChildColumns.map((col) => ({
          ...col,
          visible: true,
          type: col.type || 'string',
          order: col.order || 0,
          removable: true,
          category: col.category || 'Default'
        })),
        categoryFilters: {
          selectedParentCategories: [],
          selectedChildCategories: []
        }
      } as TableConfig
    }

    debug.log('[Table] Using existing table:', {
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
      debug.log('[Table] Category filters changed in settings:', {
        filters: newFilters,
        isInitialized: isInitialized?.value,
        timestamp: new Date().toISOString()
      })

      if (newFilters) {
        // Update categories from settings
        selectedParentCategories.value = newFilters.selectedParentCategories || []
        selectedChildCategories.value = newFilters.selectedChildCategories || []

        debug.log('[Table] Updated categories from settings:', {
          parent: selectedParentCategories.value,
          child: selectedChildCategories.value
        })
      }
    },
    { deep: true }
  )

  // Methods
  async function handleTableChange() {
    debug.log('[Table] Table change triggered:', {
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

          debug.log('[Table] Loading categories from selected table:', {
            parent: selectedParentCategories.value,
            child: selectedChildCategories.value
          })

          // Update categories regardless of initialization state
          await updateElementsData(
            selectedParentCategories.value,
            selectedChildCategories.value
          )

          debug.log('[Table] Categories updated in elements data')

          tableKey.value = Date.now().toString()
        }
      }
    } catch (err) {
      debug.error('[Table] Table change error:', err)
      loadingError.value =
        err instanceof Error ? err : new Error('Failed to handle table change')
      throw loadingError.value
    }
  }

  async function handleTableSelection(tableId: string) {
    debug.log('[Table] Table selection:', {
      tableId,
      isInitialized: isInitialized?.value,
      timestamp: new Date().toISOString()
    })

    try {
      // If no table ID provided, use default
      if (!tableId) {
        selectedTableId.value = DEFAULT_TABLE_ID
        tableName.value = DEFAULT_TABLE_NAME
        // Start with empty categories
        selectedParentCategories.value = []
        selectedChildCategories.value = []

        debug.log('[Table] Using default table with empty categories')
      } else {
        selectedTableId.value = tableId
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

          debug.log('[Table] Loaded categories from selected table:', {
            parent: selectedParentCategories.value,
            child: selectedChildCategories.value
          })
        }
      }

      // Update categories regardless of initialization state
      await updateElementsData(
        selectedParentCategories.value,
        selectedChildCategories.value
      )

      debug.log('[Table] Selection complete:', {
        selectedId: selectedTableId.value,
        tableName: tableName.value,
        categories: {
          parent: selectedParentCategories.value,
          child: selectedChildCategories.value
        }
      })
    } catch (err) {
      debug.error('[Table] Selection error:', err)
      loadingError.value =
        err instanceof Error ? err : new Error('Failed to handle table selection')
      throw loadingError.value
    }
  }

  // Combined updateCategories function that both updates the data and saves to settings
  async function updateCategories(
    parentCategories: string[],
    childCategories: string[]
  ) {
    debug.log('[Table] Updating categories:', {
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

      debug.log('[Table] Elements data updated')

      // Then update the current table's category filters
      const currentTableConfig = settings.value?.namedTables?.[currentTableId.value]
      if (currentTableConfig) {
        const updatedTableConfig: TableConfig = {
          ...currentTableConfig,
          categoryFilters: {
            selectedParentCategories: parentCategories,
            selectedChildCategories: childCategories
          }
        }

        // Update the table config in settings
        if (settings.value?.namedTables) {
          settings.value.namedTables[currentTableId.value] = updatedTableConfig
          debug.log('[Table] Settings updated with new categories')
        }
      }

      debug.log('[Table] Categories update complete')
    } catch (err) {
      debug.error('[Table] Update error:', err)
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
