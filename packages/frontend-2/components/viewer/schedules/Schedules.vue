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
  ScheduleColumnManagementExposed
} from './types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter, NamedTableConfig } from '~/composables/useUserSettings'
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
const initComponent = ref<
  (InstanceType<typeof ScheduleInitialization> & ScheduleInitializationExposed) | null
>(null)
const dataComponent = ref<
  (InstanceType<typeof ScheduleDataManagement> & ScheduleDataManagementExposed) | null
>(null)
const parameterComponent = ref<
  | (InstanceType<typeof ScheduleParameterHandling> & ScheduleParameterHandlingExposed)
  | null
>(null)
const columnComponent = ref<
  | (InstanceType<typeof ScheduleColumnManagement> & ScheduleColumnManagementExposed)
  | null
>(null)

// State
const initialized = ref(false)
const loadingError = ref<Error | null>(null)

// Initialize state with default values
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
  selectedParentCategories: [],
  selectedChildCategories: [],
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
    parameterComponent.value.updateParameterVisibility(
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
    if (!state.selectedTableId) {
      // Reset state for new table
      state.selectedParentCategories = []
      state.selectedChildCategories = []
      state.currentTable = null
      state.tableName = '' // Initialize empty table name for new table
      return
    }

    // Load table settings
    if (initComponent.value) {
      await initComponent.value.handleTableSelection(state.selectedTableId)
      state.currentTable = initComponent.value.currentTable.value
      state.tableName = initComponent.value.tableName.value || '' // Ensure tableName is never undefined
      state.currentTableId = initComponent.value.currentTableId.value

      // Load saved categories
      state.selectedParentCategories =
        state.currentTable?.categoryFilters?.selectedParentCategories || []
      state.selectedChildCategories =
        state.currentTable?.categoryFilters?.selectedChildCategories || []

      debug.log(DebugCategories.TABLE_UPDATES, 'Table loaded:', {
        id: state.currentTableId,
        name: state.tableName,
        categories: {
          parent: state.selectedParentCategories,
          child: state.selectedChildCategories
        }
      })
    }
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to handle table change:', err)
    handleError(err instanceof Error ? err : new Error('Failed to handle table change'))
  }
}

async function handleSaveTable() {
  debug.log(DebugCategories.TABLE_UPDATES, 'Save table requested', {
    selectedId: state.selectedTableId,
    tableName: state.tableName
  })

  try {
    if (!state.tableName) {
      throw new Error('Table name is required')
    }

    // Convert ParameterDefinition to CustomParameter
    const customParameters = state.customParameters.map((param) => ({
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

    const init = initComponent.value
    if (!init) {
      throw new Error('Initialization component not available')
    }

    const config = {
      parentColumns: state.currentTableColumns,
      childColumns: state.currentDetailColumns,
      categoryFilters: {
        selectedParentCategories: state.selectedParentCategories,
        selectedChildCategories: state.selectedChildCategories
      },
      customParameters
    }

    if (state.selectedTableId) {
      // Update existing table
      await init.updateNamedTable(state.selectedTableId, {
        ...config,
        name: state.tableName
      })
    } else {
      // Create new table
      const newTableId = await init.createNamedTable(state.tableName, config)
      state.selectedTableId = newTableId
      state.currentTableId = newTableId
    }

    debug.log(DebugCategories.TABLE_UPDATES, 'Table saved successfully')
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to save table:', err)
    handleError(err instanceof Error ? err : new Error('Failed to save table'))
  }
}

async function handleToggleCategory(type: 'parent' | 'child', category: string) {
  debug.log(DebugCategories.CATEGORIES, 'Category toggle requested', {
    type,
    category,
    currentState: {
      parent: state.selectedParentCategories,
      child: state.selectedChildCategories
    }
  })

  try {
    if (type === 'parent') {
      const index = state.selectedParentCategories.indexOf(category)
      if (index === -1) {
        state.selectedParentCategories.push(category)
      } else {
        state.selectedParentCategories.splice(index, 1)
      }
    } else {
      const index = state.selectedChildCategories.indexOf(category)
      if (index === -1) {
        state.selectedChildCategories.push(category)
      } else {
        state.selectedChildCategories.splice(index, 1)
      }
    }

    const init = initComponent.value as InstanceType<typeof ScheduleInitialization> &
      ScheduleInitializationExposed
    if (!init) return

    await init.updateElementsDataCategories(
      state.selectedParentCategories,
      state.selectedChildCategories
    )

    debug.log(DebugCategories.CATEGORIES, 'Categories updated:', {
      parent: state.selectedParentCategories,
      child: state.selectedChildCategories
    })
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to toggle category:', err)
    handleError(err instanceof Error ? err : new Error('Failed to toggle category'))
  }
}

async function handleParameterUpdate() {
  debug.log(DebugCategories.PARAMETERS, 'Parameter update requested')
  try {
    const param = parameterComponent.value as InstanceType<
      typeof ScheduleParameterHandling
    > &
      ScheduleParameterHandlingExposed
    if (!param) return

    await param.updateParameterVisibility('', true) // Trigger refresh
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to update parameters:', err)
    handleError(err instanceof Error ? err : new Error('Failed to update parameters'))
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
  handleError
})
</script>
