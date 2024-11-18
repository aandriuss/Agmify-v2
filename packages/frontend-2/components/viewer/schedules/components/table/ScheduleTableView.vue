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
      v-if="isLoading && !tableData.length"
      :loading-message="'Loading schedule data...'"
      :loading-detail="'Please wait while we prepare your data'"
      :current-step="1"
      :total-steps="1"
    />

    <!-- Error State -->
    <ScheduleErrorState
      v-if="loadingError"
      :error="loadingError"
      :show-debug="showDebug"
      @retry="retryLoading"
      @show-debug="toggleDebug"
    />

    <!-- Data Table -->
    <DataTable
      v-if="canShowTable"
      :key="`${tableKey}-${tableData.length}`"
      :table-id="currentTableId"
      :table-name="tableName"
      :data="tableData"
      :columns="effectiveTableColumns"
      :detail-columns="effectiveDetailColumns"
      :available-parent-parameters="availableParentParameters"
      :available-child-parameters="availableChildParameters"
      :loading="isLoadingAdditionalData"
      @update:both-columns="handleBothColumnsUpdate"
      @table-updated="handleTableUpdate"
      @column-visibility-change="handleColumnVisibilityChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import DataTable from '../../../components/tables/DataTable/index.vue'
import type { ColumnDef } from '../../../components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '../../../../../composables/useUserSettings'
import { debug, DebugCategories } from '../../utils/debug'
import { useMergedColumns } from '../../composables/useMergedColumns'

// Import local components
import ScheduleDebugPanel from './ScheduleDebugPanel.vue'
import ScheduleLoadingState from './ScheduleLoadingState.vue'
import ScheduleErrorState from './ScheduleErrorState.vue'

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
  selectedParentCategories: string[]
  selectedChildCategories: string[]
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

// Use merged columns with category filtering
const {
  mergedTableColumns: effectiveTableColumns,
  mergedDetailColumns: effectiveDetailColumns
} = useMergedColumns({
  currentTableColumns: computed(() => props.mergedTableColumns),
  currentDetailColumns: computed(() => props.mergedDetailColumns),
  parameterColumns: computed(() => [
    ...props.availableParentParameters,
    ...props.availableChildParameters
  ]),
  selectedParentCategories: computed(() => props.selectedParentCategories),
  selectedChildCategories: computed(() => props.selectedChildCategories),
  isInitialized: computed(() => props.isInitialized)
})

// Can show table
const canShowTable = computed(() => {
  // Check initialization first
  if (!props.isInitialized) {
    debug.log(DebugCategories.STATE, 'Table not initialized')
    return false
  }

  // Check for data
  const hasData = props.tableData.length > 0
  if (!hasData) {
    debug.log(DebugCategories.STATE, 'No table data available')
    return false
  }

  // Check for columns
  const hasColumns = effectiveTableColumns.value.length > 0
  if (!hasColumns) {
    debug.log(DebugCategories.STATE, 'No columns available')
    return false
  }

  // Check loading state
  const isStillLoading = props.isLoading && !hasData
  if (isStillLoading) {
    debug.log(DebugCategories.STATE, 'Still loading data')
    return false
  }

  // Check for errors
  if (props.loadingError) {
    debug.log(DebugCategories.STATE, 'Loading error present:', props.loadingError)
    return false
  }

  debug.log(DebugCategories.STATE, 'Table can be shown:', {
    isInitialized: props.isInitialized,
    hasData,
    hasColumns,
    isLoading: props.isLoading,
    hasError: !!props.loadingError,
    dataCount: props.tableData.length,
    columnsCount: effectiveTableColumns.value.length
  })

  return true
})

// Add debug logging for data changes
watch(
  () => props.tableData,
  (newData) => {
    debug.log(DebugCategories.DATA, 'Table data changed:', {
      timestamp: new Date().toISOString(),
      rowCount: newData.length,
      firstRow: newData[0],
      firstRowDetails: newData[0]?.details,
      withDetails: newData.filter(
        (row) => Array.isArray(row.details) && row.details.length > 0
      ).length,
      detailsExample: newData[0]?.details?.[0]
    })
  },
  { immediate: true, deep: true }
)

// Add debug logging for column changes
watch(
  [() => effectiveTableColumns.value, () => effectiveDetailColumns.value],
  ([tableColumns, detailColumns]) => {
    debug.log(DebugCategories.COLUMNS, 'Effective columns changed:', {
      timestamp: new Date().toISOString(),
      tableColumns: {
        count: tableColumns.length,
        visible: tableColumns.filter((col) => col.visible).length,
        fields: tableColumns.map((col) => col.field)
      },
      detailColumns: {
        count: detailColumns.length,
        visible: detailColumns.filter((col) => col.visible).length,
        fields: detailColumns.map((col) => col.field)
      }
    })
  },
  { immediate: true, deep: true }
)

// Add debug logging for props and state
watch(
  () => ({
    dataLength: props.tableData.length,
    columnsLength: effectiveTableColumns.value.length,
    hasError: !!props.loadingError,
    isLoading: props.isLoading
  }),
  (state) => {
    debug.log(DebugCategories.TABLE_UPDATES, 'Table view state:', state)
  },
  { immediate: true, deep: true }
)

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
      parentColumnsCount: effectiveTableColumns.value.length,
      childColumnsCount: effectiveDetailColumns.value.length
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
      parentCount: effectiveTableColumns.value.length,
      childCount: effectiveDetailColumns.value.length,
      visibleParentCount: effectiveTableColumns.value.filter((col) => col.visible)
        .length,
      visibleChildCount: effectiveDetailColumns.value.filter((col) => col.visible)
        .length
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
  debug.log(DebugCategories.INITIALIZATION, 'Table view mounted:', {
    dataLength: props.tableData.length,
    columnsLength: effectiveTableColumns.value.length
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
})
</script>

<style scoped>
.flex {
  display: flex;
}

.flex-col {
  flex-direction: column;
}

.p-4 {
  padding: 1rem;
}

.text-red-500 {
  color: rgb(239 68 68);
}

.text-gray-500 {
  color: rgb(107 114 128);
}

.mt-2 {
  margin-top: 0.5rem;
}

.viewer-container {
  position: relative;
  overflow: hidden;
}

.px-4 {
  padding-left: 1rem;
  padding-right: 1rem;
}

.py-2 {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.bg-blue-500 {
  background-color: rgb(59 130 246);
}

.hover-bg-blue-600:hover {
  background-color: rgb(37 99 235);
}

.text-white {
  color: rgb(255 255 255);
}

.rounded {
  border-radius: 0.25rem;
}
</style>
