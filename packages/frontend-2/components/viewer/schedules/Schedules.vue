<template>
  <ViewerLayoutPanel @close="$emit('close')">
    <template #title>Datasets</template>
    <LoadingState
      :is-loading="!isInitialized"
      :error="error"
      :loading-message="currentPhase === 'complete' ? '' : 'Loading data...'"
    >
      <TableLayout class="viewer-container">
        <template #header>
          <ScheduleTableHeader
            :selected-table-id="tableStore.computed.currentTable.value?.id || ''"
            :table-name="tableName"
            :tables="store.tablesArray.value || []"
            :show-category-options="showCategoryOptions"
            :has-changes="tableStore.computed.hasChanges.value"
            @update:selected-table-id="handleSelectedTableIdUpdate"
            @update:table-name="handleTableNameUpdate"
            @table-change="handleTableChange"
            @save="handleSaveTable"
            @toggle-category-options="showCategoryOptions = !showCategoryOptions"
            @manage-parameters="showParameterManager = !showParameterManager"
          />
        </template>
        <template #menu>
          <div class="menu-container">
            <CategoryMenu
              v-show="showCategoryOptions"
              :is-updating="!isInitialized || tableStore.isLoading.value"
              :error="error"
              :initial-parent-categories="categories.selectedParentCategories.value"
              :initial-child-categories="categories.selectedChildCategories.value"
              @update="handleCategoryUpdate"
            />
            <ParameterManager
              v-show="showParameterManager"
              :selected-parent-categories="categories.selectedParentCategories.value"
              :selected-child-categories="categories.selectedChildCategories.value"
              :available-parent-parameters="
                unref(parameterStore.parentAvailableBimParameters)
              "
              :available-child-parameters="
                unref(parameterStore.childAvailableBimParameters)
              "
              :selected-parent-parameters="selectedParentParameters"
              :selected-child-parameters="selectedChildParameters"
              :can-create-parameters="false"
              @parameter-visibility-change="handleParameterVisibilityChange"
              @error="handleError"
            />
          </div>
        </template>

        <template #default>
          <div class="schedule-container">
            <ScheduleMainView
              :selected-table-id="tableStore.computed.currentTable.value?.id || ''"
              :current-table="_currentTable"
              :is-initialized="isInitialized"
              :table-name="tableStore.computed.currentTable.value?.name || ''"
              :current-table-id="tableStore.computed.currentTable.value?.id || ''"
              :table-key="tableStore.lastUpdated?.toString() || ''"
              :error="error"
              :parent-base-columns="
                tableStore.computed.currentTable.value?.parentColumns || []
              "
              :parent-available-columns="parameterStore.parentAvailableBimParameters"
              :parent-visible-columns="
                tableStore.computed.currentTable.value?.parentColumns || []
              "
              :child-base-columns="
                tableStore.computed.currentTable.value?.childColumns || []
              "
              :child-available-columns="parameterStore.childAvailableBimParameters"
              :child-visible-columns="
                tableStore.computed.currentTable.value?.childColumns || []
              "
              :schedule-data="unref(store.scheduleData) || []"
              :evaluated-data="unref(store.evaluatedData) || []"
              :table-data="unref(store.tableData) || []"
              :is-loading="false"
              :is-loading-additional-data="false"
              :has-selected-categories="categories.hasSelectedCategories"
              :selected-parent-categories="unref(categories.selectedParentCategories)"
              :selected-child-categories="unref(categories.selectedChildCategories)"
              :show-parameter-manager="showParameterManager"
              :show-category-options="showCategoryOptions"
              :has-changes="hasChanges"
              :parent-elements="unref(parentElements)"
              :child-elements="unref(childElements)"
              :is-test-mode="false"
              @error="handleError"
              @table-updated="handleTableDataUpdate"
              @column-visibility-change="handleColumnVisibilityChange"
            />
          </div>
        </template>
      </TableLayout>
    </LoadingState>
  </ViewerLayoutPanel>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, unref } from 'vue'
import { gql } from '@apollo/client/core'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from '~/composables/core/store'
import { useWaitForActiveUser } from '~/lib/auth/composables/activeUser'
import { useElementsData } from '~/composables/core/tables/state/useElementsData'
import { useScheduleInitialization } from './composables/useScheduleInitialization'
import { useTableCategories } from '~/composables/core/tables/categories/useTableCategories'
import { useBIMElements } from '~/composables/core/tables/state/useBIMElements'
import { useParameterStore } from '~/composables/core/parameters/store'
import type {
  ElementData,
  SelectedParameter,
  TableColumn,
  TableSettings,
  AvailableParameter,
  BimValueType
} from '~/composables/core/types'
import { createSelectedParameter } from '~/composables/core/types/parameters/parameter-states'
import type { ColumnVisibilityPayload } from '~/composables/core/types/tables/table-events'
import { useInjectedViewerState } from '~~/lib/viewer/composables/setup'
import ScheduleMainView from './components/ScheduleMainView.vue'
import LoadingState from '~/components/core/LoadingState.vue'
import TableLayout from '~/components/core/tables/TableLayout.vue'
import CategoryMenu from '~/components/core/tables/menu/CategoryMenu.vue'
import ParameterManager from '~/components/core/parameters/ParameterManager.vue'
import { useTableStore } from '~/composables/core/tables/store/store'
import { useTablesGraphQL } from '~/composables/settings/tables/useTablesGraphQL'
import type {
  ViewerNode,
  WorldTreeRoot
} from '~/composables/core/types/viewer/viewer-types'
import { isValidDataState } from '~/composables/core/types/state'
import { useLoadingState } from '~/composables/core/tables/state/useLoadingState'
import { useApolloClient, provideApolloClient } from '@vue/apollo-composable'
import { useNuxtApp } from '#app'
import { childCategories } from '~/composables/core/config/categories'
import ScheduleTableHeader from './components/ScheduleTableHeader.vue'
import { isTableColumn } from '~/composables/core/tables/store/types'

// Type-safe array utilities
function safeArrayFrom<T>(value: T[] | undefined | null): T[] {
  return value ? Array.from(value) : []
}

// Type-safe error handling utility
function createSafeError(err: unknown): Error {
  if (err instanceof Error) return err
  if (typeof err === 'string') return new Error(err)
  return new Error('An unknown error occurred')
}

// Initialize systems
const debug = useDebug()
const store = useStore()
const parameterStore = useParameterStore()
const tableStore = useTableStore()
const bimElements = useBIMElements({
  childCategories
})

// Get viewer state
const {
  viewer: {
    metadata: { worldTree },
    init
  }
} = useInjectedViewerState()

// Type guard to check if children array exists and is non-empty
function hasValidChildren(
  node: unknown
): node is { _root: { children: ViewerNode[] } } {
  if (!node || typeof node !== 'object') return false
  const candidate = node as { _root?: { children?: ViewerNode[] } }
  return !!(
    candidate._root?.children &&
    Array.isArray(candidate._root.children) &&
    candidate._root.children.length > 0
  )
}

// Watch world tree changes for debugging only
watch(worldTree, (newTree) => {
  debug.log(DebugCategories.DATA, 'World tree updated', {
    exists: !!newTree,
    hasRoot: !!(newTree && '_root' in newTree),
    childrenCount: hasValidChildren(newTree) ? newTree._root.children.length : 0
  })
})

// Initialize refs with proper types
const error = ref<Error | null>(null)
const showCategoryOptions = ref(false)
const showParameterManager = ref(false)
const initializationAttempted = ref(false)
const tableName = ref<string>('New Table')

// Watch for table store changes
watch(
  () => tableStore.computed.currentTable.value,
  (newTable) => {
    if (newTable) {
      tableName.value = newTable.name
      store.lifecycle.update({
        selectedTableId: newTable.id,
        tableName: newTable.name
      })
    }
  },
  { immediate: true }
)

// Computed properties
// Use store's computed state for change detection
const hasChanges = computed(() => tableStore.computed.hasChanges.value)

// Category handlers
async function handleCategoryUpdate(payload: {
  type: 'parent' | 'child'
  categories: string[]
}) {
  try {
    debug.log(DebugCategories.CATEGORIES, 'Category update', payload)

    // Update store categories
    if (payload.type === 'parent') {
      store.setParentCategories(payload.categories)
    } else {
      store.setChildCategories(payload.categories)
    }

    // Update table store with new categories
    const currentTable = tableStore.computed.currentTable.value
    if (currentTable) {
      const updatedTable = {
        ...currentTable,
        categoryFilters: {
          ...currentTable.categoryFilters,
          selectedParentCategories:
            payload.type === 'parent'
              ? payload.categories
              : categories.selectedParentCategories.value,
          selectedChildCategories:
            payload.type === 'child'
              ? payload.categories
              : categories.selectedChildCategories.value
        },
        lastUpdateTimestamp: Date.now() // Force update timestamp to trigger change detection
      }

      // Update the table in store
      await tableStore.updateTable(updatedTable)

      // Update the original table in store to ensure change detection works
      const tableId = currentTable.id
      if (tableId) {
        const tables = new Map(tableStore.state.value.tables)
        tables.set(tableId, { ...updatedTable })
        tableStore.state.value.tables = tables
      }
    }

    await elementsData.initializeData()
  } catch (err) {
    handleError(err)
  }
}

function handleTableChange() {
  try {
    debug.log(DebugCategories.TABLE_UPDATES, 'Table change requested')
    // No need to initialize data here since it's already done in handleSelectedTableIdUpdate
  } catch (err) {
    handleError(err)
  }
}

// Table operations handlers
async function handleSelectedTableIdUpdate(tableId: string) {
  try {
    debug.log(DebugCategories.TABLE_UPDATES, 'Table selection changed', {
      tableId,
      currentId: tableStore.computed.currentTable.value?.id,
      currentName: tableName.value
    })

    // Skip if same table is selected
    if (tableId === tableStore.computed.currentTable.value?.id) {
      debug.log(DebugCategories.TABLE_UPDATES, 'Same table selected, skipping update')
      return
    }

    if (tableId) {
      // Load the table first
      await tableStore.loadTable(tableId)
      const selectedTable = tableStore.computed.currentTable.value

      if (selectedTable) {
        // Update name and store after loading
        tableName.value = selectedTable.name

        // Update categories from the selected table
        // Update categories using loadCategories
        await categories.loadCategories(
          selectedTable.categoryFilters.selectedParentCategories || [],
          selectedTable.categoryFilters.selectedChildCategories || []
        )

        // Update store state
        await store.lifecycle.update({
          selectedTableId: tableId,
          tableName: selectedTable.name,
          selectedParentCategories:
            selectedTable.categoryFilters.selectedParentCategories || [],
          selectedChildCategories:
            selectedTable.categoryFilters.selectedChildCategories || []
        })

        // Initialize data after store updates
        await elementsData.initializeData()
      }
    } else {
      // Clear selection
      tableName.value = 'New Table'
      await categories.loadCategories([], [])
      await store.lifecycle.update({
        selectedTableId: '',
        tableName: 'New Table',
        selectedParentCategories: [],
        selectedChildCategories: []
      })
    }
  } catch (err) {
    handleError(err)
  }
}

async function handleTableNameUpdate(name: string) {
  try {
    const currentTable = tableStore.computed.currentTable.value
    const currentId = currentTable?.id

    debug.log(DebugCategories.TABLE_UPDATES, 'Table name changed', {
      name,
      currentId,
      existingTableName: currentTable?.name,
      isNewTable: !currentTable,
      currentStoreName: tableName.value
    })

    // Only update if name actually changed
    if (name !== tableName.value) {
      tableName.value = name

      // Update both stores to ensure consistency
      if (currentTable) {
        await tableStore.updateTable({
          ...currentTable,
          name,
          displayName: name
        })
      }

      await store.lifecycle.update({
        tableName: name,
        selectedTableId: currentId || ''
      })
    }
  } catch (err) {
    handleError(err)
  }
}

async function handleSaveTable() {
  try {
    debug.log(DebugCategories.TABLE_UPDATES, 'Saving table')

    // Get Nuxt app instance
    const nuxtApp = useNuxtApp()
    if (!nuxtApp?.runWithContext) {
      throw new Error('Nuxt app context not available')
    }

    // Run save operation in Nuxt context
    await nuxtApp.runWithContext(async () => {
      // Ensure Apollo client is provided
      const { client: apolloClient } = useApolloClient()
      if (!apolloClient) throw new Error('Apollo client not initialized')
      provideApolloClient(apolloClient)

      // Get current table state
      const currentTable = tableStore.computed.currentTable.value
      const currentTableId = currentTable?.id

      // Determine if we're creating or updating
      const isNewTable = !currentTableId || !currentTable
      const tableId = isNewTable ? `table-${Date.now()}` : currentTableId

      debug.log(DebugCategories.TABLE_UPDATES, 'Table save operation type:', {
        currentTableId,
        currentTableName: currentTable?.name,
        isNewTable,
        newTableId: tableId,
        newTableName: tableName.value
      })

      // If we're updating an existing table, use its current settings as base
      const baseSettings = currentTable || {
        id: tableId,
        name: tableName.value,
        displayName: tableName.value,
        parentColumns: [],
        childColumns: [],
        categoryFilters: {
          selectedParentCategories: [],
          selectedChildCategories: []
        },
        selectedParameters: {
          parent: [],
          child: []
        },
        filters: [],
        lastUpdateTimestamp: Date.now()
      }

      // Ensure we have valid columns with parameters
      const parentColumns = (baseSettings.parentColumns || []).map((col) => {
        const parameter = col.parameter || {}
        const group = parameter.group || 'Base Properties'

        return {
          ...col,
          parameter: createSelectedParameter(
            {
              id: col.id || '',
              name: col.header || '',
              kind: 'bim' as const,
              type: (parameter.type || 'string') as BimValueType,
              value: parameter.value || null,
              metadata: parameter.metadata || {},
              visible: parameter.visible ?? true,
              isSystem: false,
              fetchedGroup: group,
              currentGroup: group
            },
            parameter.order || 0,
            parameter.visible ?? true
          )
        }
      })

      const childColumns = (baseSettings.childColumns || []).map((col) => {
        const parameter = col.parameter || {}
        const group = parameter.group || 'Base Properties'

        return {
          ...col,
          parameter: createSelectedParameter(
            {
              id: col.id || '',
              name: col.header || '',
              kind: 'bim' as const,
              type: (parameter.type || 'string') as BimValueType,
              value: parameter.value || null,
              metadata: parameter.metadata || {},
              visible: parameter.visible ?? true,
              isSystem: false,
              fetchedGroup: group,
              currentGroup: group
            },
            parameter.order || 0,
            parameter.visible ?? true
          )
        }
      })

      const tableConfig: TableSettings = {
        id: tableId,
        name: tableName.value,
        displayName: tableName.value,
        parentColumns,
        childColumns,
        categoryFilters: {
          selectedParentCategories: categories.selectedParentCategories.value || [],
          selectedChildCategories: categories.selectedChildCategories.value || []
        },
        selectedParameters: {
          parent: selectedParentParameters.value || [],
          child: selectedChildParameters.value || []
        },
        filters: [],
        lastUpdateTimestamp: Date.now()
      }

      debug.log(DebugCategories.TABLE_UPDATES, 'Saving table config:', {
        id: tableConfig.id,
        name: tableConfig.name,
        parentColumns: tableConfig.parentColumns.length,
        childColumns: tableConfig.childColumns.length
      })

      // Save table to store
      await tableStore.saveTable(tableConfig)

      // Fetch updated tables list
      const graphqlOps = await useTablesGraphQL()
      const tables = await graphqlOps.fetchTables()
      const existingTables = Object.entries(tables)
        .map(([id, table]: [string, TableSettings]) => ({
          id,
          name: table.name || 'Unnamed Table'
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

      // Update store with latest data - ensure selection is set before tables array
      await store.lifecycle.update({
        selectedTableId: tableConfig.id,
        tableName: tableConfig.name
      })

      // Then update tables array
      await store.lifecycle.update({
        tablesArray: existingTables
      })

      // Force selection update in table store
      await tableStore.loadTable(tableConfig.id)

      // Reload categories to ensure UI is in sync
      await categories.loadCategories(
        tableConfig.categoryFilters.selectedParentCategories || [],
        tableConfig.categoryFilters.selectedChildCategories || []
      )

      debug.log(DebugCategories.TABLE_UPDATES, 'Table saved successfully', {
        id: tableConfig.id,
        name: tableConfig.name
      })
    })
  } catch (err) {
    handleError(err)
  }
}

// Initialize data composables with category refs
const categories = useTableCategories({
  initialState: {
    selectedParentCategories: [],
    selectedChildCategories: []
  },
  onUpdate: async (state) => {
    debug.log(DebugCategories.CATEGORIES, 'Categories updated', state)
    await store.lifecycle.update({
      selectedParentCategories: state.selectedParentCategories,
      selectedChildCategories: state.selectedChildCategories
    })
    await elementsData.initializeData()
  },
  onError: (err) => updateErrorState(createSafeError(err))
})

const elementsData = useElementsData({
  selectedParentCategories: categories.selectedParentCategories,
  selectedChildCategories: categories.selectedChildCategories
})

// Safe computed properties from state with proper type checking
const parentElements = computed<ElementData[]>(() => {
  const state = elementsData.state.value
  if (!isValidDataState(state)) return []
  return safeArrayFrom(state.parentElements)
})

const childElements = computed<ElementData[]>(() => {
  const state = elementsData.state.value
  if (!isValidDataState(state)) return []
  return safeArrayFrom(state.childElements)
})

// Convert TableSettings to TableSettings
const _currentTable = computed(() => {
  const current = tableStore.computed.currentTable.value
  if (!current) return null

  return {
    ...current,
    lastUpdateTimestamp: tableStore.lastUpdated.value
  }
})

// Transform parameters for ParameterManager
const selectedParentParameters = computed(() => {
  const columns = tableStore.computed.currentTable.value?.parentColumns || []
  return columns.map((col) => {
    // Ensure parameter exists and has required properties
    const parameter = col.parameter || {}
    const kind = parameter.kind || 'unknown'
    const group = parameter.group || 'Base Properties'

    return createSelectedParameter(
      {
        id: col.id || '',
        name: col.header || '',
        kind,
        type: parameter.type || 'string',
        value: parameter.value || null,
        group,
        visible: col.visible ?? true,
        isSystem: false,
        metadata: parameter.metadata || {},
        ...(kind === 'bim' && {
          fetchedGroup: group,
          currentGroup: group
        })
      } as AvailableParameter,
      col.order || 0,
      col.visible ?? true
    )
  })
})

const selectedChildParameters = computed(() => {
  const columns = tableStore.computed.currentTable.value?.childColumns || []
  return columns.map((col) => {
    // Ensure parameter exists and has required properties
    const parameter = col.parameter || {}
    const kind = parameter.kind || 'unknown'
    const group = parameter.group || 'Base Properties'

    return createSelectedParameter(
      {
        id: col.id || '',
        name: col.header || '',
        kind,
        type: parameter.type || 'string',
        value: parameter.value || null,
        group,
        visible: col.visible ?? true,
        isSystem: false,
        metadata: parameter.metadata || {},
        ...(kind === 'bim' && {
          fetchedGroup: group,
          currentGroup: group
        })
      } as AvailableParameter,
      col.order || 0,
      col.visible ?? true
    )
  })
})

// Initialize core composables
// Create a store adapter that matches the Store interface
const storeAdapter = {
  ...store,
  lifecycle: {
    init: async () => {
      if (tableStore.initialize) {
        await tableStore.initialize()
      } else {
        await store.lifecycle.init()
      }
    },
    update: async (updates: Record<string, unknown>) => {
      // Handle column updates through table store
      if ('currentTableColumns' in updates || 'currentDetailColumns' in updates) {
        const parentColumns = Array.isArray(updates.currentTableColumns)
          ? (updates.currentTableColumns as TableColumn[])
          : []
        const childColumns = Array.isArray(updates.currentDetailColumns)
          ? (updates.currentDetailColumns as TableColumn[])
          : []
        await tableStore.updateColumns(parentColumns, childColumns)
      }
      // Pass other updates to core store
      else {
        await store.lifecycle.update(updates)
      }
    },
    cleanup: async () => {
      if (tableStore.reset) {
        await tableStore.reset()
      } else {
        await store.lifecycle.cleanup()
      }
    }
  }
}

const { initComponent } = useScheduleInitialization({
  store: storeAdapter
})

// Expose necessary functions
defineExpose({
  handleError: (err: unknown) => updateErrorState(createSafeError(err)),
  handleTableDataUpdate,
  handleColumnVisibilityChange
})

// Loading state management
const { isLoading, currentPhase, transitionPhase, validateData } = useLoadingState()

// Computed properties for component state
const isInitialized = computed(() => currentPhase.value === 'complete')

// Handler functions with type safety
function handleTableDataUpdate(): void {
  updateErrorState(null)
}

// Type guard for SelectedParameter
function isSelectedParameter(value: unknown): value is SelectedParameter {
  if (!value || typeof value !== 'object') return false
  const param = value as { id?: unknown; visible?: unknown }
  return typeof param.id === 'string' && typeof param.visible === 'boolean'
}

async function handleParameterVisibilityChange(
  parameter: SelectedParameter
): Promise<void> {
  try {
    // Validate parameter
    if (!isSelectedParameter(parameter)) {
      throw new Error('Invalid parameter object')
    }

    const { id, visible } = parameter
    debug.log(DebugCategories.PARAMETERS, 'Parameter visibility changed', {
      id,
      visible
    })

    // Get current columns
    const parentColumns = tableStore.computed.currentTable.value?.parentColumns || []

    // Map and validate columns
    const updatedParentColumns = parentColumns.map((col): TableColumn => {
      if (!isTableColumn(col)) {
        throw new Error('Invalid parent column structure')
      }
      return {
        ...col,
        visible: col.id === id ? visible : col.visible,
        parameter: {
          ...col.parameter,
          visible: col.id === id ? visible : col.parameter.visible
        }
      }
    })

    const currentChildColumns =
      tableStore.computed.currentTable.value?.childColumns || []
    const updatedChildColumns = currentChildColumns.map((col): TableColumn => {
      if (!isTableColumn(col)) {
        throw new Error('Invalid child column structure')
      }
      return col
    })

    // Update parameter visibility in table store
    await tableStore.updateColumns(updatedParentColumns, updatedChildColumns)

    debug.log(DebugCategories.PARAMETERS, 'Parameter visibility updated in stores')
  } catch (err) {
    handleError(err)
  }
}

async function handleColumnVisibilityChange(
  payload: ColumnVisibilityPayload
): Promise<void> {
  try {
    debug.log(DebugCategories.COLUMNS, 'Column visibility changed', {
      field: payload.column.id,
      visible: payload.visible
    })

    // Map and validate columns
    const currentParentColumns =
      tableStore.computed.currentTable.value?.parentColumns || []
    const updatedParentColumns = currentParentColumns.map((col): TableColumn => {
      if (!isTableColumn(col)) {
        throw new Error('Invalid parent column structure')
      }
      return {
        ...col,
        visible: col.id === payload.column.id ? payload.visible : col.visible,
        parameter: {
          ...col.parameter,
          visible:
            col.id === payload.column.id ? payload.visible : col.parameter.visible
        }
      }
    })

    const currentChildColumns =
      tableStore.computed.currentTable.value?.childColumns || []
    const updatedChildColumns = currentChildColumns.map((col): TableColumn => {
      if (!isTableColumn(col)) {
        throw new Error('Invalid child column structure')
      }
      return {
        ...col,
        visible: col.id === payload.column.id ? payload.visible : col.visible,
        parameter: {
          ...col.parameter,
          visible:
            col.id === payload.column.id ? payload.visible : col.parameter.visible
        }
      }
    })

    // Update column visibility in table store
    await tableStore.updateColumns(updatedParentColumns, updatedChildColumns)

    debug.log(DebugCategories.COLUMNS, 'Column visibility updated', {
      columnId: payload.column.id,
      visible: payload.visible,
      type: payload.column.parameter.kind
    })

    debug.log(DebugCategories.COLUMNS, 'Column visibility updated in stores')
  } catch (err) {
    updateErrorState(createSafeError(err))
  }
}

// Type-safe error handling with proper type guards
function updateErrorState(newError: Error | null): void {
  const currentError = error.value
  const shouldUpdate = currentError?.message !== newError?.message

  if (shouldUpdate) {
    error.value = newError
  }

  if (newError instanceof Error) {
    const errorDetails: {
      name: string
      message: string
      stack?: string
      cause?: unknown
    } = {
      name: newError.name,
      message: newError.message,
      stack: newError.stack,
      cause: newError.cause
    }
    debug.error(DebugCategories.ERROR, 'Schedule error:', errorDetails)
    debug.error(DebugCategories.ERROR, 'Error in schedule view:', {
      error: errorDetails,
      state: {
        phase: currentPhase.value,
        isLoading: isLoading.value,
        hasElements: bimElements.allElements.value?.length || 0,
        hasParameters: parameterStore.parentRawParameters.value?.length || 0,
        hasTable: !!tableStore.computed.currentTable.value
      }
    })
  }
}

function handleError(err: unknown): void {
  const error = createSafeError(err)
  debug.error(DebugCategories.ERROR, 'Failed to load initial data:', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause as unknown
    },
    state: {
      phase: currentPhase.value,
      isLoading: isLoading.value,
      hasElements: bimElements.allElements.value?.length || 0,
      hasParameters: parameterStore.parentRawParameters.value?.length || 0,
      hasTable: !!tableStore.computed.currentTable.value
    }
  })
  updateErrorState(error)
}

// Helper to wait for world tree with timeout
const waitForWorldTree = async (timeoutMs = 5000): Promise<void> => {
  if (init.ref.value && worldTree.value) return

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('World tree initialization timed out'))
    }, timeoutMs)

    const unwatch = watch(
      () => ({ init: init.ref.value, tree: worldTree.value }),
      ({ init, tree }) => {
        if (init && tree) {
          clearTimeout(timeout)
          unwatch()
          resolve()
        }
      },
      { immediate: true }
    )
  })
}

// Initialize with phase-based loading
onMounted(async () => {
  if (initializationAttempted.value) {
    debug.warn(DebugCategories.INITIALIZATION, 'Initialization already attempted')
    return
  }

  try {
    // Start initialization sequence
    transitionPhase('initial')
    debug.startState(DebugCategories.INITIALIZATION, 'Starting initialization sequence')

    // 1. Initialize Apollo client
    const { client: apolloClient } = useApolloClient()
    if (!apolloClient) throw new Error('Apollo client not initialized')
    provideApolloClient(apolloClient)

    // Wait for Apollo client to be ready
    await new Promise<void>((resolve, reject) => {
      let attempts = 0
      const maxAttempts = 50 // 5 seconds total

      const checkClient = async () => {
        attempts++
        debug.log(DebugCategories.INITIALIZATION, 'Checking Apollo client', {
          attempt: attempts,
          hasClient: !!apolloClient,
          hasCache: !!apolloClient.cache
        })

        // Try to execute a simple query to verify client is ready
        try {
          await apolloClient.query({
            query: gql`
              query TestQuery {
                __typename
              }
            `
          })
          debug.log(DebugCategories.INITIALIZATION, 'Apollo client ready')
          resolve()
        } catch (err) {
          debug.log(DebugCategories.INITIALIZATION, 'Apollo client not ready yet', {
            attempt: attempts,
            error: err
          })
          if (attempts >= maxAttempts) {
            reject(new Error('Apollo client initialization timed out'))
          } else {
            setTimeout(checkClient, 100)
          }
        }
      }
      void checkClient()
    })

    debug.log(DebugCategories.INITIALIZATION, 'Apollo client ready')

    // 2. Initialize core store
    transitionPhase('core_store')
    debug.log(DebugCategories.INITIALIZATION, 'Initializing core store')
    await store.lifecycle.init()
    if (!store.initialized.value) {
      debug.error(DebugCategories.ERROR, 'Core store failed to initialize', {
        storeState: store.state.value
      })
      throw new Error('Core store failed to initialize')
    }
    debug.log(DebugCategories.INITIALIZATION, 'Core store initialized')

    // 3. Initialize parameter store
    transitionPhase('parameter_store')
    debug.log(DebugCategories.INITIALIZATION, 'Initializing parameter store')
    await parameterStore.init()
    if (!parameterStore.state.value.initialized) {
      debug.error(DebugCategories.ERROR, 'Parameter store failed to initialize', {
        parameterState: parameterStore.state.value
      })
      throw new Error('Parameter store failed to initialize')
    }
    debug.log(DebugCategories.INITIALIZATION, 'Parameter store initialized')

    // 4. Initialize table store
    transitionPhase('table_store')
    debug.log(DebugCategories.INITIALIZATION, 'Initializing table store')
    await initComponent.initialize()
    if (!tableStore.computed.currentTable.value) {
      debug.error(DebugCategories.ERROR, 'Table store failed to initialize', {
        tableState: tableStore.state.value,
        currentTable: tableStore.computed.currentTable.value
      })
      throw new Error('Table store failed to initialize')
    }
    debug.log(DebugCategories.INITIALIZATION, 'Table store initialized')

    // 5. Wait for auth
    const waitForUser = useWaitForActiveUser()
    const userResult = await waitForUser()
    if (!userResult?.data?.activeUser) {
      throw new Error('Authentication required')
    }

    // 6. Initialize world tree
    transitionPhase('world_tree')
    await waitForWorldTree()
    if (!worldTree.value) {
      throw new Error('World tree not available')
    }

    // 7. Initialize BIM elements
    transitionPhase('bim_elements')
    const treeRoot: WorldTreeRoot = {
      _root: {
        children: hasValidChildren(worldTree.value)
          ? worldTree.value._root.children
          : []
      }
    }

    await bimElements.initializeElements(treeRoot)
    const elementsWithParams =
      bimElements.allElements.value?.filter(
        (el) => el.parameters && Object.keys(el.parameters).length > 0
      ) || []

    if (elementsWithParams.length === 0) {
      throw new Error('No parameters found in BIM elements')
    }

    // Process parameters
    await parameterStore.processParameters(elementsWithParams)
    const validation = validateData()
    if (!validation.hasParameters) {
      throw new Error('Parameter processing failed')
    }

    // 8. Load tables and initialize data
    transitionPhase('data_sync')

    try {
      // First initialize table store
      await tableStore.initialize()
      debug.log(DebugCategories.INITIALIZATION, 'Table store initialized')

      // Then fetch tables from GraphQL
      const graphqlOps = await useTablesGraphQL()
      const tables = await graphqlOps.fetchTables()
      debug.log(DebugCategories.INITIALIZATION, 'Tables fetched from GraphQL', {
        tableCount: Object.keys(tables).length
      })

      // Initialize element data
      await elementsData.initializeData()
      if (elementsData.hasError.value) {
        throw new Error('Failed to initialize element data')
      }
      debug.log(DebugCategories.INITIALIZATION, 'Element data initialized')

      // Process and update tables in store
      const existingTables = Object.entries(tables)
        .map(([id, table]: [string, TableSettings]) => ({
          id,
          name: table.name || 'Unnamed Table'
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

      // Get current table or first available
      const currentId = store.state.value.currentTableId
      const currentTable = currentId ? tables[currentId] : existingTables[0]
      const selectedId = currentId || currentTable?.id

      if (selectedId) {
        await tableStore.loadTable(selectedId)
        const loadedTable = tableStore.computed.currentTable.value
        if (loadedTable) {
          // Update store state with all tables
          await store.lifecycle.update({
            tablesArray: existingTables,
            selectedTableId: selectedId,
            tableName: loadedTable.name,
            selectedParentCategories:
              loadedTable.categoryFilters.selectedParentCategories,
            selectedChildCategories: loadedTable.categoryFilters.selectedChildCategories
          })
        }
      }

      debug.log(DebugCategories.INITIALIZATION, 'Store updated with tables', {
        tableCount: existingTables.length,
        tableIds: existingTables.map((t) => t.id),
        selectedId: store.state.value.currentTableId
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to initialize tables:', err)
      throw new Error('Failed to initialize tables')
    }

    // Final validation
    const finalValidation = validateData()
    if (!finalValidation.dataConsistent) {
      throw new Error('Data inconsistency detected after initialization')
    }

    // Check if we're already initialized
    if (currentPhase.value === 'complete') {
      debug.log(
        DebugCategories.INITIALIZATION,
        'Already initialized, skipping completion'
      )
      return
    }

    // Check if we have everything we need
    const hasData = (store.scheduleData.value?.length ?? 0) > 0
    const hasTable = !!tableStore.computed.currentTable.value
    const hasParams = parameterStore.state.value.initialized

    debug.log(DebugCategories.INITIALIZATION, 'Checking initialization state:', {
      hasData,
      hasTable,
      hasParams,
      dataLength: store.scheduleData.value?.length ?? 0
    })

    // Complete initialization if we have everything
    if (hasData && hasTable && hasParams) {
      transitionPhase('complete')
      debug.completeState(DebugCategories.INITIALIZATION, 'Initialization complete')
      return
    }

    // Otherwise, throw an error
    throw new Error('Missing required data')
  } catch (err) {
    handleError(err)
  }
})
</script>

<style scoped>
.viewer-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.schedule-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>
