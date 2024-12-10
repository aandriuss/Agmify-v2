<template>
  <ScheduleLayout
    :selected-table-id="store.selectedTableId.value || ''"
    :table-name="store.tableName.value || ''"
    :tables="store.tablesArray.value || []"
    :show-category-options="showCategoryOptions"
    :has-changes="hasChanges"
    :is-loading="isLoading"
    :is-updating="isUpdating"
    :parent-categories="parentCategories"
    :child-categories="childCategories"
    :selected-parent-categories="categories.selectedParentCategories.value"
    :selected-child-categories="categories.selectedChildCategories.value"
    @update:selected-table-id="handleSelectedTableIdUpdate"
    @update:table-name="handleTableNameUpdate"
    @table-change="handleTableChange"
    @save="handleSaveTable"
    @toggle-category-options="toggleCategoryOptions"
    @toggle-parameter-manager="toggleParameterManager"
    @toggle-category="handleCategoryToggle"
    @close="handleClose"
  >
    <div class="schedule-container">
      <ScheduleLoadingState :is-loading="isLoading" :error="error" @retry="handleRetry">
        <ScheduleMainView
          :selected-table-id="store.selectedTableId.value || ''"
          :current-table="currentTable"
          :is-initialized="isInitialized"
          :table-name="store.tableName.value || ''"
          :current-table-id="store.currentTableId.value || ''"
          :table-key="store.tableKey.value || '0'"
          :error="error"
          :parent-base-columns="store.parentBaseColumns.value || []"
          :parent-available-columns="store.parentAvailableColumns.value || []"
          :parent-visible-columns="store.parentVisibleColumns.value || []"
          :child-base-columns="store.childBaseColumns.value || []"
          :child-available-columns="store.childAvailableColumns.value || []"
          :child-visible-columns="store.childVisibleColumns.value || []"
          :schedule-data="store.scheduleData.value || []"
          :evaluated-data="store.evaluatedData.value || []"
          :table-data="store.tableData.value || []"
          :is-loading="isLoading"
          :is-loading-additional-data="isUpdating"
          :has-selected-categories="hasSelectedCategories"
          :selected-parent-categories="categories.selectedParentCategories.value"
          :selected-child-categories="categories.selectedChildCategories.value"
          :show-parameter-manager="showParameterManager"
          :processed-headers="processedHeaders"
          :custom-parameters="store.customParameters.value || []"
          :parent-elements="parentElements"
          :child-elements="childElements"
          :available-parent-headers="availableParentHeaders"
          :available-child-headers="availableChildHeaders"
          :is-test-mode="isTestMode"
          @update:both-columns="handleBothColumnsUpdate"
          @table-updated="handleTableDataUpdate"
          @column-visibility-change="handleColumnVisibilityChange"
          @row-expand="handleRowExpand"
          @row-collapse="handleRowCollapse"
          @error="handleError"
          @update:parameter-columns="handleParameterColumnsUpdate"
          @update:evaluated-data="handleEvaluatedDataUpdate"
          @update:merged-parent-parameters="handleMergedParentParametersUpdate"
          @update:merged-child-parameters="handleMergedChildParametersUpdate"
          @update:merged-table-columns="handleMergedTableColumnsUpdate"
          @update:merged-detail-columns="handleMergedDetailColumnsUpdate"
          @column-order-change="handleColumnOrderChange"
          @update:show-parameter-manager="showParameterManager = $event"
          @parameter-update="handleParameterUpdate"
          @parameter-visibility-update="handleParameterVisibility"
          @parameter-order-update="handleParameterOrder"
          @update:is-test-mode="isTestMode = $event"
        />
      </ScheduleLoadingState>
    </div>
  </ScheduleLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { isEqual } from 'lodash-es'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from './core/store'
import { useProcessedHeaders } from './composables/useProcessedHeaders'
import { useElementsData } from './composables/useElementsData'
import { parentCategories, childCategories } from './config/categories'
import { defaultTable } from './config/defaultColumns'
import { useUnifiedParameters } from './composables/useUnifiedParameters'
import { useScheduleInteractions } from './composables/useScheduleInteractions'
import { useScheduleInitialization } from './composables/useScheduleInitialization'
import { useScheduleCategories } from './composables/useScheduleCategories'
import type {
  ElementData,
  TableRow,
  ColumnDef,
  NamedTableConfig,
  StoreState,
  UserParameter
} from '~/composables/core/types'
import { createUserParameter, isUserParameter } from '~/composables/core/types'
import ScheduleLayout from './components/ScheduleLayout.vue'
import ScheduleLoadingState from './components/ScheduleLoadingState.vue'
import ScheduleMainView from './components/ScheduleMainView.vue'
import { useTablesState } from '~/composables/settings/tables/useTablesState'

// Define emits
const emit = defineEmits<{
  'row-expand': [row: TableRow | ElementData]
  'row-collapse': [row: TableRow | ElementData]
}>()

// Initialize debug system
const debug = useDebug()

// Add test mode state
const isTestMode = ref(false)

// Initialize refs
const error = ref<Error | null>(null)

// Initialize core composables
const store = useStore()
const tablesState = useTablesState()

// Get current table from tablesState
const currentTable = computed(() => {
  const selectedId = store.selectedTableId.value
  if (!selectedId) return null

  // Find table by ID in tablesState
  return (
    Object.values(tablesState.state.value?.tables || {}).find(
      (table): table is NamedTableConfig => table.id === selectedId
    ) || null
  )
})

// Initialize categories after store
const categories = useScheduleCategories({
  initialState: {
    selectedParentCategories: defaultTable.categoryFilters.selectedParentCategories,
    selectedChildCategories: defaultTable.categoryFilters.selectedChildCategories
  },
  onUpdate: async (state) => {
    if (store.lifecycle) {
      await store.lifecycle.update({
        selectedParentCategories: state.selectedParentCategories,
        selectedChildCategories: state.selectedChildCategories
      } as Partial<StoreState>)
    }
  }
})

const { initComponent } = useScheduleInitialization({
  store,
  categories: {
    selectedParentCategories: categories.selectedParentCategories,
    selectedChildCategories: categories.selectedChildCategories
  }
})

// Initialize interactions with proper initialization component
const interactions = useScheduleInteractions({
  state: {
    selectedTableId: '',
    tableName: '',
    currentTable: null,
    selectedParentCategories: categories.selectedParentCategories.value,
    selectedChildCategories: categories.selectedChildCategories.value,
    currentTableColumns: [],
    currentDetailColumns: []
  },
  initComponent,
  updateCurrentColumns: async (parentColumns, childColumns) => {
    if (store.lifecycle) {
      await store.lifecycle.update({
        currentTableColumns: parentColumns,
        currentDetailColumns: childColumns,
        mergedTableColumns: parentColumns,
        mergedDetailColumns: childColumns
      } as Partial<StoreState>)
    }
  },
  handleError: (err: unknown) => {
    const error = err instanceof Error ? err : new Error('Unknown error occurred')
    debug.error(DebugCategories.ERROR, 'Schedule error:', error)
  }
})

const {
  showCategoryOptions,
  showParameterManager,
  toggleCategoryOptions,
  toggleParameterManager,
  handleClose,
  handleSaveTable,
  handleBothColumnsUpdate,
  state: interactionsState
} = interactions

// Initialize data composables with new category refs
const elementsData = useElementsData({
  selectedParentCategories: categories.selectedParentCategories,
  selectedChildCategories: categories.selectedChildCategories
})

// Loading state - only show loading when we have no data
const isLoading = computed(() => {
  // If we have data, don't show loading
  if (store.scheduleData.value?.length > 0) return false
  // If we have table data, don't show loading
  if (store.tableData.value?.length > 0) return false
  // If we're still processing elements, show loading
  if (elementsData.processingState?.isProcessingElements) return true
  // Otherwise show loading
  return true
})

const isInitialized = computed(() => store.initialized.value ?? false)

const isUpdating = computed(() => {
  return elementsData.processingState?.isProcessingElements ?? false
})

const hasSelectedCategories = computed(() => categories.hasSelectedCategories.value)

const hasChanges = computed(() => {
  // Get the current table settings from tables state
  const currentTableId = store.selectedTableId?.value
  if (!currentTableId) {
    // For new table, check if we have any changes from default state
    return !!(
      store.tableName?.value !== 'New Table' || // Name has been changed from default
      categories.selectedParentCategories?.value?.length > 0 ||
      categories.selectedChildCategories?.value?.length > 0 ||
      store.currentTableColumns?.value?.length > 0 ||
      store.currentDetailColumns?.value?.length > 0
    )
  }

  // Find current table by ID
  const currentTable = Object.values(tablesState.state?.value?.tables || {}).find(
    (table): table is NamedTableConfig => 'id' in table && table.id === currentTableId
  )
  if (!currentTable) return false

  // Find original table by ID
  const originalTable = Object.values(tablesState.originalTables?.value || {}).find(
    (table): table is NamedTableConfig => 'id' in table && table.id === currentTableId
  )

  // If no original table exists, this is a new table
  if (!originalTable || !('categoryFilters' in originalTable)) return true

  // Compare current state with original state
  const hasNameChanges = currentTable.name !== originalTable.name

  // Check category changes
  const hasParentCategoryChanges = !isEqual(
    categories.selectedParentCategories?.value || [],
    originalTable.categoryFilters?.selectedParentCategories || []
  )
  const hasChildCategoryChanges = !isEqual(
    categories.selectedChildCategories?.value || [],
    originalTable.categoryFilters?.selectedChildCategories || []
  )

  // Check column changes
  const hasParentColumnChanges = !isEqual(
    store.currentTableColumns?.value || [],
    originalTable.parentColumns || []
  )
  const hasChildColumnChanges = !isEqual(
    store.currentDetailColumns?.value || [],
    originalTable.childColumns || []
  )

  // Check parameter changes
  const hasParameterChanges = !isEqual(
    store.customParameters?.value || [],
    originalTable.selectedParameterIds || []
  )

  // Log changes for debugging
  debug.log(DebugCategories.STATE, 'Change detection', {
    hasNameChanges,
    hasParentCategoryChanges,
    hasChildCategoryChanges,
    hasParentColumnChanges,
    hasChildColumnChanges,
    hasParameterChanges,
    currentParentCategories: categories.selectedParentCategories?.value,
    originalParentCategories: originalTable.categoryFilters?.selectedParentCategories,
    currentChildCategories: categories.selectedChildCategories?.value,
    originalChildCategories: originalTable.categoryFilters?.selectedChildCategories,
    currentParentColumns: store.currentTableColumns?.value,
    originalParentColumns: originalTable.parentColumns,
    currentChildColumns: store.currentDetailColumns?.value,
    originalChildColumns: originalTable.childColumns
  })

  return (
    hasNameChanges ||
    hasParentCategoryChanges ||
    hasChildCategoryChanges ||
    hasParentColumnChanges ||
    hasChildColumnChanges ||
    hasParameterChanges
  )
})

// Process headers
const { processedHeaders } = useProcessedHeaders({
  headers: computed(() => store.availableHeaders.value)
})

// Helper function to safely get parameter ID
function getParameterId(param: unknown): string | null {
  if (
    param &&
    typeof param === 'object' &&
    'id' in param &&
    typeof param.id === 'string'
  ) {
    return param.id
  }
  return null
}

// Parameter handling - this will automatically update the store
useUnifiedParameters({
  discoveredParameters: computed(
    () => store.availableHeaders.value || { parent: [], child: [] }
  ),
  customParameters: computed<UserParameter[]>(
    () => (store.customParameters.value as UserParameter[]) || []
  )
})

// Computed properties for available headers with required ColumnDef properties
const availableParentHeaders = computed<ColumnDef[]>(() => {
  const columns = store.currentTableColumns?.value || []
  return columns.map((col) => ({
    ...col,
    type: col.type || 'string',
    source: col.source || 'Parameters',
    category: col.category || 'Uncategorized',
    description: col.description || '',
    visible: col.visible ?? true,
    removable: col.removable ?? true,
    order: col.order ?? 0
  }))
})

const availableChildHeaders = computed<ColumnDef[]>(() => {
  const columns = store.currentDetailColumns?.value || []
  return columns.map((col) => ({
    ...col,
    type: col.type || 'string',
    source: col.source || 'Parameters',
    category: col.category || 'Uncategorized',
    description: col.description || '',
    visible: col.visible ?? true,
    removable: col.removable ?? true,
    order: col.order ?? 0
  }))
})

// Computed properties for relationship data
const parentElements = computed<ElementData[]>(() => {
  const data = store.scheduleData.value || []
  return data.filter(
    (el): el is ElementData =>
      typeof el === 'object' &&
      el !== null &&
      'isChild' in el &&
      (el as ElementData).isChild === false
  )
})

const childElements = computed<ElementData[]>(() => {
  const data = store.scheduleData.value || []
  return data.filter(
    (el): el is ElementData =>
      typeof el === 'object' &&
      el !== null &&
      'isChild' in el &&
      (el as ElementData).isChild === true
  )
})

// Handler functions
function handleTableDataUpdate() {
  try {
    error.value = null
  } catch (err) {
    handleError(err)
  }
}

async function handleRetry() {
  try {
    error.value = null
    await elementsData.initializeData()
  } catch (err) {
    handleError(err)
  }
}

function handleParameterColumnsUpdate() {
  try {
    error.value = null
  } catch (err) {
    handleError(err)
  }
}

function handleMergedParentParametersUpdate() {
  error.value = null
}

function handleMergedChildParametersUpdate() {
  error.value = null
}

function handleMergedTableColumnsUpdate() {
  error.value = null
}

function handleMergedDetailColumnsUpdate() {
  error.value = null
}

async function handleSelectedTableIdUpdate(value: string) {
  try {
    debug.startState(DebugCategories.TABLE_UPDATES, 'Updating selected table')

    // Apply settings for selected table
    await applyTableSettings(value)

    // Update elements with new categories
    await elementsData.updateCategories(
      categories.selectedParentCategories.value,
      categories.selectedChildCategories.value
    )

    debug.completeState(DebugCategories.TABLE_UPDATES, 'Table selection updated')
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Error updating selected table:', err)
    handleError(err)
  }
}

// Watch for store changes to update interactions state
watch(
  [
    () => store.selectedTableId?.value,
    () => store.tableName?.value,
    () => store.currentTableColumns?.value,
    () => store.currentDetailColumns?.value,
    () => categories.selectedParentCategories?.value,
    () => categories.selectedChildCategories?.value
  ],
  ([
    selectedTableId,
    tableName,
    parentColumns,
    childColumns,
    parentCategories,
    childCategories
  ]) => {
    if (!store.initialized.value) return

    debug.log(DebugCategories.STATE, 'Store state changed, updating interactions', {
      selectedTableId,
      tableName,
      parentColumnsCount: parentColumns?.length,
      childColumnsCount: childColumns?.length,
      currentInteractionsState: interactionsState.value
    })

    // Ensure we have a valid table name
    const newTableName = tableName || ''

    // Update interactions state
    interactionsState.value = {
      selectedTableId: selectedTableId || '',
      tableName: newTableName,
      currentTable: null,
      selectedParentCategories: parentCategories || [],
      selectedChildCategories: childCategories || [],
      currentTableColumns: parentColumns || [],
      currentDetailColumns: childColumns || []
    }

    debug.log(DebugCategories.STATE, 'Updated interactions state', {
      newState: interactionsState.value
    })
  },
  { immediate: true, deep: true }
)

function handleTableNameUpdate(value: string) {
  try {
    debug.log(DebugCategories.TABLE_UPDATES, 'Updating table name', {
      value,
      currentStoreName: store.tableName.value,
      currentInteractionsName: interactionsState.value.tableName
    })

    // Update store
    store.setTableInfo({ tableName: value })

    // Ensure interactions state is updated
    interactionsState.value = {
      ...interactionsState.value,
      tableName: value
    }

    debug.log(DebugCategories.TABLE_UPDATES, 'Table name updated', {
      newStoreName: store.tableName.value,
      newInteractionsName: interactionsState.value.tableName
    })
  } catch (err) {
    handleError(err)
  }
}

function handleColumnVisibilityChange() {
  error.value = null
}

function handleColumnOrderChange() {
  error.value = null
}

function handleParameterVisibility() {
  error.value = null
}

function handleParameterOrder() {
  error.value = null
}

function handleEvaluatedDataUpdate() {
  try {
    error.value = null
  } catch (err) {
    handleError(err)
  }
}

async function handleParameterUpdate() {
  try {
    debug.startState(DebugCategories.PARAMETERS, 'Updating parameters')
    error.value = null

    // Get current table from tablesState
    const table = Object.values(tablesState.state.value?.tables || {}).find(
      (t): t is NamedTableConfig => t.id === store.currentTableId.value
    )

    if (!table) {
      throw new Error('Table not found')
    }

    // Get existing parameters to preserve their types and values
    const existingParams = store.customParameters.value || []
    const existingParamMap = new Map(
      existingParams
        .map((param) => {
          const id = getParameterId(param)
          return id ? [id, param] : null
        })
        .filter(
          (entry): entry is [string, UserParameter] =>
            entry !== null && typeof entry[1] === 'object' && entry[1] !== null
        )
    )

    // Convert parameter IDs to UserParameter objects
    const customParameters = (table.selectedParameterIds || []).map(
      (id): UserParameter => {
        const existing = existingParamMap.get(id)

        // If parameter exists and is a valid UserParameter, preserve it
        if (existing && isUserParameter(existing)) {
          return existing
        }

        // Create new parameter with default values
        return createUserParameter({
          id,
          name: id,
          field: id,
          type: 'fixed',
          group: 'Custom',
          visible: true,
          header: id,
          removable: true,
          value: null
        })
      }
    )

    // Update store with parameters
    await store.lifecycle.update({
      customParameters
    } as Partial<StoreState>)

    debug.completeState(DebugCategories.PARAMETERS, 'Parameters updated', {
      parameterCount: customParameters.length,
      tableId: store.currentTableId.value,
      parameterTypes: customParameters.map((p) => p.type)
    })
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Error updating parameters:', err)
    handleError(err)
  }
}

// Update applyTableSettings to use the same safe parameter handling
async function applyTableSettings(tableId: string) {
  try {
    debug.startState(DebugCategories.INITIALIZATION, 'Applying table settings')

    // Find table settings by ID from tablesState
    const table = Object.values(tablesState.state.value?.tables || {}).find(
      (t): t is NamedTableConfig => t.id === tableId
    )

    if (tableId === '') {
      // Creating new table - keep current settings
      debug.log(
        DebugCategories.INITIALIZATION,
        'Creating new table, keeping current settings'
      )
      await store.lifecycle.update({
        selectedTableId: '',
        currentTableId: '',
        tableName: 'New Table',
        currentTableColumns: store.currentTableColumns?.value || [],
        currentDetailColumns: store.currentDetailColumns?.value || [],
        mergedTableColumns: store.currentTableColumns?.value || [],
        mergedDetailColumns: store.currentDetailColumns?.value || [],
        customParameters: [] // Reset custom parameters for new table
      } as Partial<StoreState>)

      // Keep current categories
      await categories.loadCategories(
        categories.selectedParentCategories.value || [],
        categories.selectedChildCategories.value || []
      )
    } else if (table) {
      // Get existing parameters to preserve their types and values
      const existingParams = store.customParameters.value || []
      const existingParamMap = new Map(
        existingParams
          .map((param) => {
            const id = getParameterId(param)
            return id ? [id, param] : null
          })
          .filter(
            (entry): entry is [string, UserParameter] =>
              entry !== null && typeof entry[1] === 'object' && entry[1] !== null
          )
      )

      // Convert parameter IDs to UserParameter objects
      const customParameters = (table.selectedParameterIds || []).map(
        (id): UserParameter => {
          const existing = existingParamMap.get(id)

          // If parameter exists and is a valid UserParameter, preserve it
          if (existing && isUserParameter(existing)) {
            return existing
          }

          // Create new parameter with default values
          return createUserParameter({
            id,
            name: id,
            field: id,
            type: 'fixed',
            group: 'Custom',
            visible: true,
            header: id,
            removable: true,
            value: null
          })
        }
      )

      // Loading existing table
      await store.lifecycle.update({
        selectedTableId: tableId,
        currentTableId: tableId,
        tableName: table.name,
        currentTableColumns: table.parentColumns || [],
        currentDetailColumns: table.childColumns || [],
        mergedTableColumns: table.parentColumns || [],
        mergedDetailColumns: table.childColumns || [],
        customParameters
      } as Partial<StoreState>)

      // Update categories using new composable
      await categories.loadCategories(
        table.categoryFilters?.selectedParentCategories || [],
        table.categoryFilters?.selectedChildCategories || []
      )
    } else {
      // Fallback to default settings
      await store.lifecycle.update({
        selectedTableId: tableId,
        currentTableId: tableId,
        tableName: 'Default Table',
        currentTableColumns: defaultTable.parentColumns || [],
        currentDetailColumns: defaultTable.childColumns || [],
        mergedTableColumns: defaultTable.parentColumns || [],
        mergedDetailColumns: defaultTable.childColumns || [],
        customParameters: [] // Reset custom parameters for default table
      } as Partial<StoreState>)

      // Load default categories
      await categories.loadCategories(
        defaultTable.categoryFilters.selectedParentCategories || [],
        defaultTable.categoryFilters.selectedChildCategories || []
      )
    }
  } catch (error) {
    debug.error(DebugCategories.ERROR, 'Error applying table settings:', error)
    handleError(error)
  }
}

function handleTableChange() {
  try {
    error.value = null
  } catch (err) {
    handleError(err)
  }
}

function handleCategoryToggle(type: 'parent' | 'child', category: string) {
  categories.handleCategoryToggle(type, category)
}

function handleRowExpand(row: TableRow | ElementData) {
  if (!('id' in row) || !('type' in row) || !('isChild' in row)) return

  debug.log(DebugCategories.TABLE_DATA, 'Row expanded', {
    id: row.id,
    type: row.type,
    isChild: row.isChild,
    hasDetails: 'details' in row && Array.isArray(row.details)
  })
  emit('row-expand', row)
}

function handleRowCollapse(row: TableRow | ElementData) {
  if (!('id' in row) || !('type' in row) || !('isChild' in row)) return

  debug.log(DebugCategories.TABLE_DATA, 'Row collapsed', {
    id: row.id,
    type: row.type,
    isChild: row.isChild,
    hasDetails: 'details' in row && Array.isArray(row.details)
  })
  emit('row-collapse', row)
}

// Error handling with type safety
function handleError(err: Error | unknown): void {
  // Type guard for Error objects
  function isError(value: unknown): value is Error {
    return value instanceof Error
  }

  // Create a safe error object
  const safeError = isError(err)
    ? err
    : new Error(typeof err === 'string' ? err : 'Unknown error occurred')

  // Set error state
  error.value = safeError

  // Safe error logging with type guards
  const errorDetails = {
    name: isError(err) ? err.name : 'Error',
    message: safeError.message,
    stack: isError(err) && typeof err.stack === 'string' ? err.stack : undefined
  }

  debug.error(DebugCategories.ERROR, 'Schedule error:', errorDetails)
}

onMounted(async () => {
  try {
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing schedules')

    // Load tables first
    await tablesState.loadTables()

    // Extract tables info and update store
    const tables = Object.values(tablesState.state.value?.tables || {})
      .filter((table): table is NamedTableConfig => {
        if (!table || typeof table !== 'object') return false
        return 'id' in table && table.id !== 'defaultTable'
      })
      .map((table) => ({
        id: table.id,
        name: table.name || 'Unnamed Table'
      }))

    await store.lifecycle.update({
      tablesArray: tables
    } as Partial<StoreState>)

    // Get the last selected table ID from localStorage
    const lastSelectedId = localStorage.getItem('speckle:lastSelectedTableId')

    // Determine which table to select
    let tableIdToSelect: string
    if (lastSelectedId && tables.some((table) => table.id === lastSelectedId)) {
      // Use stored ID if it exists and is valid
      tableIdToSelect = lastSelectedId
    } else {
      // Otherwise use first table or default
      tableIdToSelect = tables.length > 0 ? tables[0].id : 'default'
    }

    // Apply settings for selected table
    await applyTableSettings(tableIdToSelect)

    // Initialize elements data
    await elementsData.initializeData()

    debug.completeState(DebugCategories.INITIALIZATION, 'Schedules initialized')
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Error initializing schedules:', err)
    handleError(err)
  }
})

// Clean up
onBeforeUnmount(() => {
  elementsData.stopWorldTreeWatch()
})

// Expose necessary functions with type safety
defineExpose({
  handleError: (err: Error | unknown) => handleError(err),
  handleParameterUpdate: () => handleParameterUpdate(),
  handleBothColumnsUpdate: (updates: {
    parentColumns: ColumnDef[]
    childColumns: ColumnDef[]
  }) => handleBothColumnsUpdate(updates),
  handleTableDataUpdate: () => handleTableDataUpdate()
})
</script>

<style scoped>
.schedule-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>
