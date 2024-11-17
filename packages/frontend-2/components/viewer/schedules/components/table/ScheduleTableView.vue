<template>
  <div>
    <!-- Debug Panel -->
    <ScheduleDebugPanel
      v-if="showDebug"
      :schedule-data="scheduleData"
      :evaluated-data="evaluatedData"
      :debug-filter="debugFilter"
      @toggle="toggleDebug"
    />

    <!-- Loading State -->
    <ScheduleLoadingState
      v-if="isLoading"
      :loading-message="loadingMessage"
      :loading-detail="loadingDetail"
      :current-step="currentLoadingStep"
      :total-steps="loadingSteps.length"
    />

    <!-- Data Table -->
    <DataTable
      v-else-if="canShowTable"
      :key="`${tableKey}-${scheduleData.length}`"
      :table-id="currentTableId"
      :table-name="tableName"
      :data="tableData"
      :columns="mergedTableColumns"
      :detail-columns="mergedDetailColumns"
      :available-parent-parameters="availableParentParameters"
      :available-child-parameters="availableChildParameters"
      :loading="isLoadingAdditionalData"
      @update:both-columns="handleBothColumnsUpdate"
      @table-updated="handleTableUpdate"
      @column-visibility-change="handleColumnVisibilityChange"
    />

    <!-- Error State -->
    <ScheduleErrorState
      v-else-if="loadingError"
      :error="loadingError"
      :show-debug="showDebug"
      @retry="retryLoading"
      @show-debug="toggleDebug"
    />

    <!-- Empty State -->
    <ScheduleEmptyState
      v-else
      :no-categories-selected="noCategoriesSelected"
      :has-table-name="!!tableName"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import DataTable from '../../../components/tables/DataTable/index.vue'
import type { ColumnDef } from '../../../components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '../../../../../composables/useUserSettings'
import { debug, DebugCategories } from '../../utils/debug'
import { useTableView } from '../../composables/useTableView'

// Import local components
import ScheduleDebugPanel from './ScheduleDebugPanel.vue'
import ScheduleLoadingState from './ScheduleLoadingState.vue'
import ScheduleErrorState from './ScheduleErrorState.vue'
import ScheduleEmptyState from './ScheduleEmptyState.vue'

// Import types
import type {
  TableConfig,
  TableUpdatePayload,
  TableRowData,
  ElementData
} from '../../types'

interface Props {
  selectedTableId: string
  currentTable: TableConfig | null
  isInitialized: boolean
  tableName: string
  currentTableId: string
  tableKey: string
  loadingError: Error | null
  mergedTableColumns: ColumnDef[]
  mergedDetailColumns: ColumnDef[]
  availableParentParameters: CustomParameter[]
  availableChildParameters: CustomParameter[]
  scheduleData: ElementData[]
  evaluatedData: ElementData[]
  tableData: TableRowData[]
  isLoading: boolean
  isLoadingAdditionalData: boolean
  noCategoriesSelected: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:both-columns': [
    updates: { parentColumns: ColumnDef[]; childColumns: ColumnDef[] }
  ]
  'table-updated': [payload: TableUpdatePayload]
  'column-visibility-change': [column: ColumnDef]
}>()

// Debug state
const showDebug = ref(false)
const debugFilter = ref('')

// Loading steps
const loadingSteps = ['Initialization', 'Data Loading', 'Processing', 'Rendering']
const currentLoadingStep = computed(() => {
  if (!props.isInitialized) return 0
  if (!props.selectedTableId) return 1
  if (!props.currentTable) return 2
  return 3
})

const loadingMessage = computed(() => {
  if (!props.isInitialized) return 'Initializing...'
  if (!props.selectedTableId) return 'Select a table or create a new one'
  if (!props.currentTable) return 'Loading table...'
  return 'Preparing table...'
})

const loadingDetail = computed(() => {
  if (!props.isInitialized) {
    return 'Setting up data structures...'
  }
  if (!props.selectedTableId) {
    return 'Choose an existing table or create a new one'
  }
  if (!props.currentTable) {
    return 'Loading table settings...'
  }
  return 'Almost ready...'
})

// Table state
const { canShowTable } = useTableView({
  mergedTableColumns: computed(() => props.mergedTableColumns),
  tableData: computed(() => props.tableData)
})

// Event handlers
const handleBothColumnsUpdate = (updates: {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
}) => {
  debug.log(DebugCategories.TABLE_UPDATES, 'Column update:', {
    timestamp: new Date().toISOString(),
    updates: {
      parentColumnsCount: updates.parentColumns.length,
      childColumnsCount: updates.childColumns.length
    },
    current: {
      parentColumnsCount: props.mergedTableColumns.length,
      childColumnsCount: props.mergedDetailColumns.length
    }
  })
  emit('update:both-columns', updates)
}

const handleTableUpdate = (payload: TableUpdatePayload) => {
  debug.log(DebugCategories.TABLE_UPDATES, 'Table update:', {
    timestamp: new Date().toISOString(),
    payload,
    currentTable: {
      id: props.currentTable?.id,
      name: props.currentTable?.name
    }
  })
  emit('table-updated', payload)
}

const handleColumnVisibilityChange = (column: ColumnDef) => {
  debug.log(DebugCategories.COLUMNS, 'Column visibility change:', {
    timestamp: new Date().toISOString(),
    column: {
      field: column.field,
      visible: column.visible,
      category: column.category
    },
    currentColumns: {
      parentCount: props.mergedTableColumns.length,
      childCount: props.mergedDetailColumns.length,
      visibleParentCount: props.mergedTableColumns.filter((col) => col.visible).length,
      visibleChildCount: props.mergedDetailColumns.filter((col) => col.visible).length
    }
  })
  emit('column-visibility-change', column)
}

// Debug panel toggle
const toggleDebug = () => {
  showDebug.value = !showDebug.value
  debug.log(DebugCategories.DEBUG, 'Debug panel toggled:', {
    timestamp: new Date().toISOString(),
    showDebug: showDebug.value
  })
}

// Debug panel keyboard shortcut
const handleKeyPress = (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'd') {
    event.preventDefault()
    toggleDebug()
  }
}

// Retry loading
const retryLoading = () => {
  window.location.reload()
}

// Lifecycle hooks
onMounted(() => {
  window.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
})
</script>
