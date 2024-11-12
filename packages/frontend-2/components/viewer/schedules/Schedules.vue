<template>
  <div>
    <LayoutPanel :initial-width="400" @close="handleClose">
      <template #header>
        <ScheduleHeader
          v-model:selected-table-id="state.selectedTableId"
          v-model:table-name="state.tableName"
          :tables="state.tablesArray"
          :show-category-options="showCategoryOptions"
          @table-change="handleTableChange"
          @save="handleSaveTable"
          @manage-parameters="toggleParameterManager"
          @toggle-category-options="toggleCategoryOptions"
        />
      </template>

      <div class="flex flex-col">
        <!-- Error Alert -->
        <ScheduleErrorAlert
          :error="loadingError"
          @recovery-action="handleRecoveryAction"
        />

        <!-- Category Filters -->
        <ScheduleCategoryFilters
          :show-category-options="showCategoryOptions"
          :parent-categories="parentCategories"
          :child-categories="childCategories"
          :selected-parent-categories="state.selectedParentCategories"
          :selected-child-categories="state.selectedChildCategories"
          :is-initialized="initialized"
          @toggle-category="handleToggleCategory"
        />

        <!-- Core Components -->
        <ScheduleInitialization
          ref="initComponent"
          v-model:initialized="initialized"
          @settings-loaded="handleSettingsLoaded"
          @data-initialized="handleDataInitialized"
          @error="handleError"
        />

        <ScheduleDataManagement
          v-if="initialized"
          ref="dataComponent"
          :schedule-data="state.scheduleData"
          :evaluated-data="state.evaluatedData"
          :custom-parameters="state.customParameters"
          :merged-table-columns="state.mergedTableColumns"
          :merged-detail-columns="state.mergedDetailColumns"
          :is-initialized="initialized"
          @update:table-data="handleTableDataUpdate"
          @error="handleError"
        />

        <ScheduleParameterHandling
          v-if="initialized"
          ref="parameterComponent"
          :schedule-data="state.scheduleData"
          :custom-parameters="state.customParameters"
          :selected-parent-categories="state.selectedParentCategories"
          :selected-child-categories="state.selectedChildCategories"
          :available-headers="state.availableHeaders"
          :is-initialized="initialized"
          @update:parameter-columns="handleParameterColumnsUpdate"
          @update:evaluated-data="handleEvaluatedDataUpdate"
          @update:merged-parent-parameters="handleMergedParentParametersUpdate"
          @update:merged-child-parameters="handleMergedChildParametersUpdate"
          @error="handleError"
        />

        <ScheduleColumnManagement
          v-if="initialized"
          ref="columnComponent"
          :current-table-columns="state.currentTableColumns"
          :current-detail-columns="state.currentDetailColumns"
          :parameter-columns="state.parameterColumns"
          :is-initialized="initialized"
          @update:merged-table-columns="handleMergedTableColumnsUpdate"
          @update:merged-detail-columns="handleMergedDetailColumnsUpdate"
          @column-visibility-change="handleColumnVisibilityChange"
          @error="handleError"
        />

        <!-- Table Content -->
        <ScheduleTableContent
          :selected-table-id="state.selectedTableId"
          :current-table="state.currentTable"
          :is-initialized="initialized"
          :table-data="state.tableData"
          :schedule-data="state.scheduleData"
          :table-name="state.tableName"
          :current-table-id="state.currentTableId"
          :table-key="state.tableKey"
          :loading-error="loadingError"
          :merged-table-columns="state.mergedTableColumns"
          :merged-detail-columns="state.mergedDetailColumns"
          :merged-parent-parameters="state.mergedParentParameters"
          :merged-child-parameters="state.mergedChildParameters"
          @update:both-columns="handleBothColumnsUpdate"
          @table-updated="handleTableUpdate"
          @column-visibility-change="handleColumnVisibilityChange"
        />

        <!-- Parameter Manager Modal -->
        <ScheduleParameterManagerModal
          v-model:show="showParameterManager"
          :table-id="state.currentTableId"
          @update="handleParameterUpdate"
        />
      </div>
    </LayoutPanel>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { LayoutPanel } from '@speckle/ui-components'
import type {
  ElementData,
  TableConfig,
  TableRowData,
  ScheduleInitializationExposed,
  ScheduleDataManagementExposed,
  ScheduleParameterHandlingExposed,
  ScheduleColumnManagementExposed,
  NamedTableConfig
} from './types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'
import { parentCategories, childCategories } from './config/categories'

// Components
import ScheduleHeader from './components/ScheduleHeader.vue'
import ScheduleCategoryFilters from './components/ScheduleCategoryFilters.vue'
import ScheduleTableContent from './components/ScheduleTableContent.vue'
import ScheduleErrorAlert from './components/ScheduleErrorAlert.vue'
import ScheduleParameterManagerModal from './components/ScheduleParameterManagerModal.vue'
import ScheduleInitialization from './components/ScheduleInitialization.vue'
import ScheduleDataManagement from './components/ScheduleDataManagement.vue'
import ScheduleParameterHandling from './components/ScheduleParameterHandling.vue'
import ScheduleColumnManagement from './components/ScheduleColumnManagement.vue'

// Composables
import { useScheduleUIState } from './composables/useScheduleUIState'
import { useScheduleEmits } from './composables/useScheduleEmits'
import { debug, DebugCategories } from './utils/debug'

interface ProcessedHeader {
  field: string
  header?: string
  category?: string
}

interface ScheduleState {
  selectedTableId: string
  tableName: string
  currentTableId: string
  tableKey: string
  tablesArray: { id: string; name: string }[]
  currentTable: TableConfig | null
  scheduleData: ElementData[]
  evaluatedData: ElementData[]
  tableData: TableRowData[]
  customParameters: CustomParameter[]
  parameterColumns: ColumnDef[]
  currentTableColumns: ColumnDef[]
  currentDetailColumns: ColumnDef[]
  mergedTableColumns: ColumnDef[]
  mergedDetailColumns: ColumnDef[]
  mergedParentParameters: CustomParameter[]
  mergedChildParameters: CustomParameter[]
  selectedParentCategories: string[]
  selectedChildCategories: string[]
  availableHeaders: {
    parent: ProcessedHeader[]
    child: ProcessedHeader[]
  }
}

// Emits
const emit = defineEmits<{
  close: []
}>()

const { handleClose } = useScheduleEmits({ emit })

// Component refs with proper typing
const initComponent = ref<ScheduleInitializationExposed | null>(null)
const dataComponent = ref<ScheduleDataManagementExposed | null>(null)
const parameterComponent = ref<ScheduleParameterHandlingExposed | null>(null)
const columnComponent = ref<ScheduleColumnManagementExposed | null>(null)

// State
const initialized = ref(false)
const loadingError = ref<Error | null>(null)

// Initialize state with empty arrays for selected categories
const state = reactive<ScheduleState>({
  selectedTableId: '',
  tableName: '',
  currentTableId: '',
  tableKey: Date.now().toString(),
  tablesArray: [],
  currentTable: null,
  scheduleData: [],
  evaluatedData: [],
  tableData: [],
  customParameters: [],
  parameterColumns: [],
  currentTableColumns: [],
  currentDetailColumns: [],
  mergedTableColumns: [],
  mergedDetailColumns: [],
  mergedParentParameters: [],
  mergedChildParameters: [],
  selectedParentCategories: [], // Initialize empty - will be loaded from PostgreSQL
  selectedChildCategories: [], // Initialize empty - will be loaded from PostgreSQL
  availableHeaders: {
    parent: [],
    child: []
  }
})

// UI State
const {
  showCategoryOptions,
  showParameterManager,
  toggleCategoryOptions,
  toggleParameterManager
} = useScheduleUIState()

// Event Handlers
function handleError(error: Error) {
  debug.error(DebugCategories.ERROR, 'Component error:', error)
  loadingError.value = error
}

function handleSettingsLoaded(settings: {
  namedTables: Record<string, NamedTableConfig>
}) {
  debug.log(DebugCategories.INITIALIZATION, 'Settings loaded event received', {
    initComponent: !!initComponent.value,
    hasSettings: !!settings,
    hasNamedTables: !!settings?.namedTables,
    rawSettings: settings,
    rawNamedTables: settings?.namedTables
  })

  try {
    if (!settings?.namedTables) {
      debug.warn(DebugCategories.INITIALIZATION, 'No named tables in settings')
      state.tablesArray = []
      return
    }

    // Map tables to array
    const tables = Object.entries(settings.namedTables).map(([id, table]) => ({
      id,
      name: table.name
    }))

    // Update state
    state.tablesArray = tables

    // Select first table by default if available
    if (tables.length > 0 && !state.selectedTableId) {
      const firstTable = tables[0]
      state.selectedTableId = firstTable.id
      state.tableName = firstTable.name
      void handleTableChange()
    }

    debug.log(DebugCategories.INITIALIZATION, 'Tables processed:', {
      count: tables.length,
      tables,
      rawNamedTables: settings.namedTables
    })
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to process settings:', err)
    handleError(err instanceof Error ? err : new Error('Failed to process settings'))
  }
}

function handleDataInitialized() {
  debug.log(DebugCategories.INITIALIZATION, 'Data initialized')
}

function handleTableDataUpdate(data: TableRowData[]) {
  debug.log(DebugCategories.DATA_TRANSFORM, 'Table data updated', {
    count: data.length
  })
  state.tableData = data
}

function handleParameterColumnsUpdate(columns: ColumnDef[]) {
  debug.log(DebugCategories.PARAMETERS, 'Parameter columns updated', {
    count: columns.length
  })
  state.parameterColumns = columns
}

function handleEvaluatedDataUpdate(data: ElementData[]) {
  debug.log(DebugCategories.DATA_TRANSFORM, 'Evaluated data updated', {
    count: data.length
  })
  state.evaluatedData = data
}

function handleMergedParentParametersUpdate(params: CustomParameter[]) {
  debug.log(DebugCategories.PARAMETERS, 'Merged parent parameters updated', {
    count: params.length
  })
  state.mergedParentParameters = params
}

function handleMergedChildParametersUpdate(params: CustomParameter[]) {
  debug.log(DebugCategories.PARAMETERS, 'Merged child parameters updated', {
    count: params.length
  })
  state.mergedChildParameters = params
}

function handleMergedTableColumnsUpdate(columns: ColumnDef[]) {
  debug.log(DebugCategories.COLUMNS, 'Merged table columns updated', {
    count: columns.length
  })
  state.mergedTableColumns = columns
}

function handleMergedDetailColumnsUpdate(columns: ColumnDef[]) {
  debug.log(DebugCategories.COLUMNS, 'Merged detail columns updated', {
    count: columns.length
  })
  state.mergedDetailColumns = columns
}

function handleColumnVisibilityChange(column: ColumnDef) {
  debug.log(DebugCategories.COLUMNS, 'Column visibility changed', {
    column,
    visible: column.visible
  })
  if (parameterComponent.value && 'field' in column) {
    void parameterComponent.value.updateParameterVisibility(
      column.field,
      column.visible ?? true
    )
  }
}

async function handleTableChange() {
  debug.log(DebugCategories.TABLE_UPDATES, 'Table change requested', {
    selectedId: state.selectedTableId,
    currentTable: state.currentTable
  })

  try {
    // Check initialization state first
    if (!initialized.value) {
      debug.warn(
        DebugCategories.INITIALIZATION,
        'Attempted table change before initialization'
      )
      return
    }

    if (!state.selectedTableId) {
      // Reset to empty arrays for new table - no categories selected by default
      state.selectedParentCategories = []
      state.selectedChildCategories = []
      state.currentTable = null
      state.tableName = ''
      return
    }

    // Load table settings
    const init = initComponent.value
    if (!init) return

    await init.handleTableSelection(state.selectedTableId)

    // Get current table from ref with type safety
    const currentTableRef = init.currentTable
    if (!currentTableRef?.value) {
      state.currentTable = null
      return
    }

    const namedTable = currentTableRef.value

    // Validate required fields
    if (
      !namedTable.name ||
      !Array.isArray(namedTable.parentColumns) ||
      !Array.isArray(namedTable.childColumns)
    ) {
      throw new Error('Invalid table configuration')
    }

    // Type guard for category filters
    const categoryFilters = namedTable.categoryFilters
    const selectedParentCategories = Array.isArray(
      categoryFilters?.selectedParentCategories
    )
      ? categoryFilters.selectedParentCategories
      : []
    const selectedChildCategories = Array.isArray(
      categoryFilters?.selectedChildCategories
    )
      ? categoryFilters.selectedChildCategories
      : []

    // Create safe table config
    const safeTable: TableConfig = {
      name: namedTable.name,
      parentColumns: namedTable.parentColumns,
      childColumns: namedTable.childColumns,
      categoryFilters: {
        selectedParentCategories,
        selectedChildCategories
      },
      customParameters: Array.isArray(namedTable.customParameters)
        ? namedTable.customParameters
        : []
    }

    // Update state with safe values
    state.currentTable = safeTable
    state.tableName = init.tableName?.value ?? ''
    state.currentTableId = init.currentTableId?.value ?? ''

    // Update category state
    state.selectedParentCategories = selectedParentCategories
    state.selectedChildCategories = selectedChildCategories

    debug.log(DebugCategories.TABLE_UPDATES, 'Table loaded:', {
      id: state.currentTableId,
      name: state.tableName,
      categories: {
        parent: state.selectedParentCategories,
        child: state.selectedChildCategories
      }
    })
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to handle table change:', err)
    handleError(err instanceof Error ? err : new Error('Failed to handle table change'))
  }
}

async function handleSaveTable() {
  debug.log(DebugCategories.TABLE_UPDATES, 'Save table requested', {
    selectedId: state.selectedTableId,
    tableName: state.tableName,
    currentTable: state.currentTable
  })

  try {
    // Check initialization state first
    if (!initialized.value) {
      debug.warn(
        DebugCategories.INITIALIZATION,
        'Attempted to save table before initialization'
      )
      return
    }

    if (!state.tableName) {
      throw new Error('Table name is required')
    }

    const init = initComponent.value
    if (!init) {
      throw new Error('Initialization component not available')
    }

    // For new tables, create an initial table config
    if (!state.selectedTableId) {
      const config = {
        name: state.tableName,
        parentColumns: [],
        childColumns: [],
        categoryFilters: {
          selectedParentCategories: state.selectedParentCategories,
          selectedChildCategories: state.selectedChildCategories
        },
        customParameters: []
      }

      // Create new table
      const newTableId = await init.createNamedTable(state.tableName, config)
      if (newTableId) {
        state.selectedTableId = newTableId
        state.currentTableId = newTableId
        state.currentTable = config
      }
      return
    }

    // For existing tables, ensure we have current table data
    if (!state.currentTable) {
      // Try to load table data first
      await handleTableChange()
    }

    // Create base config with current state
    const baseConfig = {
      name: state.tableName,
      parentColumns: state.currentTableColumns,
      childColumns: state.currentDetailColumns,
      categoryFilters: {
        selectedParentCategories: state.selectedParentCategories,
        selectedChildCategories: state.selectedChildCategories
      },
      customParameters: state.customParameters.map((param) => ({
        id: param.field,
        name: param.name,
        type: 'fixed' as const,
        field: param.field,
        header: param.header,
        category: param.category || 'Custom Parameters',
        color: param.color,
        description: param.description,
        removable: param.removable,
        visible: param.visible,
        order: param.order
      }))
    }

    // Merge with existing table data if available
    const config = state.currentTable
      ? {
          ...state.currentTable,
          ...baseConfig
        }
      : baseConfig

    // Update existing table
    const updatedTable = await init.updateNamedTable(state.selectedTableId, config)

    // Convert NamedTableConfig to TableConfig and update state
    state.currentTable = {
      name: updatedTable.name,
      parentColumns: updatedTable.parentColumns,
      childColumns: updatedTable.childColumns,
      categoryFilters: updatedTable.categoryFilters,
      customParameters: updatedTable.customParameters
    }

    // Force UI refresh
    state.tableKey = Date.now().toString()

    // Trigger table reload to ensure we have latest data
    await handleTableChange()

    debug.log(DebugCategories.TABLE_UPDATES, 'Table saved successfully', {
      config,
      currentTable: state.currentTable
    })
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to save table:', err)
    handleError(err instanceof Error ? err : new Error('Failed to save table'))
  }
}

function handleToggleCategory(type: 'parent' | 'child', category: string) {
  debug.log(DebugCategories.CATEGORIES, 'Category toggle requested', {
    type,
    category,
    currentState: {
      parent: state.selectedParentCategories,
      child: state.selectedChildCategories
    }
  })

  try {
    // Check initialization state first
    if (!initialized.value) {
      debug.warn(
        DebugCategories.INITIALIZATION,
        'Attempted to toggle category before initialization'
      )
      return
    }

    // Validate inputs
    if (!state.selectedTableId) {
      throw new Error('No table selected')
    }

    if (!category || typeof category !== 'string') {
      throw new Error('Invalid category')
    }

    // Create new arrays for updated selections
    const updatedParentCategories = [...state.selectedParentCategories]
    const updatedChildCategories = [...state.selectedChildCategories]

    // Update selections
    if (type === 'parent') {
      const index = updatedParentCategories.indexOf(category)
      if (index === -1) {
        updatedParentCategories.push(category)
      } else {
        updatedParentCategories.splice(index, 1)
      }
    } else {
      const index = updatedChildCategories.indexOf(category)
      if (index === -1) {
        updatedChildCategories.push(category)
      } else {
        updatedChildCategories.splice(index, 1)
      }
    }

    // Update local state immediately for responsive UI
    state.selectedParentCategories = updatedParentCategories
    state.selectedChildCategories = updatedChildCategories

    // Update currentTable to match if it exists
    if (state.currentTable) {
      state.currentTable = {
        ...state.currentTable,
        categoryFilters: {
          selectedParentCategories: updatedParentCategories,
          selectedChildCategories: updatedChildCategories
        }
      }
    }

    // Get initialization component
    const init = initComponent.value
    if (!init) {
      throw new Error('Initialization component not available')
    }

    // Save to PostgreSQL in background
    void init.updateNamedTable(state.selectedTableId, {
      categoryFilters: {
        selectedParentCategories: updatedParentCategories,
        selectedChildCategories: updatedChildCategories
      }
    })

    debug.log(DebugCategories.CATEGORIES, 'Categories updated:', {
      parent: updatedParentCategories,
      child: updatedChildCategories
    })
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to toggle category')
    debug.error(DebugCategories.ERROR, 'Failed to toggle category:', error)
    handleError(error)
  }
}

function handleTableUpdate() {
  debug.log(DebugCategories.TABLE_UPDATES, 'Table update requested')
  state.tableKey = Date.now().toString()
}

function handleBothColumnsUpdate(updates: {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
}) {
  debug.log(DebugCategories.COLUMNS, 'Both columns update requested', updates)
  state.currentTableColumns = updates.parentColumns
  state.currentDetailColumns = updates.childColumns
}

async function handleParameterUpdate() {
  debug.log(DebugCategories.PARAMETERS, 'Parameter update requested')
  try {
    const param = parameterComponent.value
    if (!param) {
      throw new Error('Parameter component not available')
    }

    // Trigger refresh of parameter visibility
    await param.updateParameterVisibility('', true)

    debug.log(DebugCategories.PARAMETERS, 'Parameter update completed')
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to update parameters')
    debug.error(DebugCategories.ERROR, 'Failed to update parameters:', error)
    handleError(error)
  }
}

async function handleRecoveryAction() {
  debug.log(DebugCategories.ERROR, 'Recovery action requested')
  try {
    // Reset error state
    loadingError.value = null

    // Reload current table if any
    if (state.selectedTableId) {
      await handleTableChange()
    }
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Recovery failed:', err)
    handleError(err instanceof Error ? err : new Error('Recovery failed'))
  }
}

// Expose necessary functions
defineExpose({
  handleError,
  handleParameterUpdate,
  handleRecoveryAction,
  handleBothColumnsUpdate,
  handleTableUpdate,
  handleTableDataUpdate,
  handleToggleCategory
})
</script>
