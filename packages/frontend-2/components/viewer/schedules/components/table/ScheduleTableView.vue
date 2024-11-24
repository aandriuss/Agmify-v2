<template>
  <div>
    <!-- Loading State -->
    <ScheduleLoadingState
      v-if="props.isLoading && !hasAnyData"
      loading-message="Loading schedule data..."
      loading-detail="Please wait while we prepare your data"
      :current-step="1"
      :total-steps="1"
    />

    <!-- Error State -->
    <ScheduleErrorState
      v-else-if="props.loadingError && !hasAnyData"
      :error="props.loadingError"
      :show-debug="showDebug"
      @retry="retryLoading"
      @show-debug="toggleDebug"
    />

    <!-- Table -->
    <DataTable
      v-else-if="hasAnyData"
      :key="`${props.tableKey}-${props.tableData.length}-${parentVisibleColumns.length}`"
      :table-id="props.currentTableId"
      :table-name="props.tableName"
      :data="props.tableData"
      :schedule-data="props.scheduleData"
      :columns="parentVisibleColumns"
      :detail-columns="childVisibleColumns"
      :available-parent-parameters="props.availableParentParameters"
      :available-child-parameters="props.availableChildParameters"
      :loading="props.isLoadingAdditionalData"
      :initial-state="{
        columns: parentVisibleColumns,
        detailColumns: childVisibleColumns,
        expandedRows: expandedRows,
        sortField: 'mark',
        sortOrder: 1,
        filters: {}
      }"
      @update:both-columns="handleBothColumnsUpdate"
      @update:expanded-rows="handleExpandedRowsUpdate"
      @row-expand="handleRowExpand"
      @row-collapse="handleRowCollapse"
      @table-updated="$emit('table-updated')"
      @column-visibility-change="$emit('column-visibility-change')"
      @error="$emit('error', $event)"
    />

    <!-- Empty State -->
    <div v-else class="p-4 text-center">
      <div class="text-lg font-semibold mb-2">No Data Available</div>
      <div class="text-gray-500">
        Select categories or add parameters to view schedule data
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DataTable from '../../../components/tables/DataTable/index.vue'
import type { ColumnDef } from '../../../components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'
import type { TableConfig, TableRow, ElementData } from '../../types'
import { useDebug, DebugCategories } from '../../debug/useDebug'

// Import local components
import ScheduleLoadingState from './ScheduleLoadingState.vue'
import ScheduleErrorState from './ScheduleErrorState.vue'

interface Props {
  selectedTableId: string
  currentTable: TableConfig | null
  isInitialized: boolean
  tableName: string
  currentTableId: string
  tableKey: string
  loadingError: Error | null
  // Parent columns
  parentBaseColumns: ColumnDef[] // Base columns from PostgreSQL
  parentAvailableColumns: ColumnDef[] // All available columns (including custom)
  parentVisibleColumns: ColumnDef[] // Currently visible columns
  // Child columns
  childBaseColumns: ColumnDef[] // Base columns from PostgreSQL
  childAvailableColumns: ColumnDef[] // All available columns (including custom)
  childVisibleColumns: ColumnDef[] // Currently visible columns
  // Parameters
  availableParentParameters: CustomParameter[]
  availableChildParameters: CustomParameter[]
  // Data
  scheduleData: ElementData[]
  evaluatedData: ElementData[]
  tableData: TableRow[]
  // State
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
  'row-expand': [row: TableRow | ElementData]
  'row-collapse': [row: TableRow | ElementData]
  'table-updated': []
  'column-visibility-change': []
  error: [error: Error | unknown]
}>()

// Initialize debug
const debug = useDebug()

// Debug state
const showDebug = ref(true)

// Track expanded rows
const expandedRows = ref<(TableRow | ElementData)[]>([])

// Simplified table visibility check
const hasAnyData = computed(() => {
  if (!props.isInitialized) {
    return false
  }

  // Only show table if we have both data and columns
  const hasData = props.tableData.length > 0
  const hasColumns = props.parentVisibleColumns.length > 0

  debug.log(DebugCategories.TABLE_DATA, 'Table visibility check', {
    hasData,
    hasColumns,
    dataLength: props.tableData.length,
    columnLength: props.parentVisibleColumns.length
  })

  return hasData && hasColumns
})

// Event handlers
function handleBothColumnsUpdate(updates: {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
}): void {
  emit('update:both-columns', updates)
}

function handleExpandedRowsUpdate(rows: (TableRow | ElementData)[]): void {
  debug.log(DebugCategories.TABLE_DATA, 'Expanded rows updated', {
    count: rows.length,
    rows: rows.map((row) => ({
      id: row.id,
      mark: row.mark,
      hasDetails: 'details' in row && Array.isArray(row.details)
    }))
  })
  expandedRows.value = rows
}

function handleRowExpand(row: TableRow | ElementData): void {
  debug.log(DebugCategories.TABLE_DATA, 'Row expanded', {
    id: row.id,
    mark: row.mark,
    hasDetails: 'details' in row && Array.isArray(row.details)
  })
  emit('row-expand', row)
}

function handleRowCollapse(row: TableRow | ElementData): void {
  debug.log(DebugCategories.TABLE_DATA, 'Row collapsed', {
    id: row.id,
    mark: row.mark,
    hasDetails: 'details' in row && Array.isArray(row.details)
  })
  emit('row-collapse', row)
}

function toggleDebug(): void {
  showDebug.value = !showDebug.value
}

function retryLoading(): void {
  window.location.reload()
}
</script>

<style scoped>
.p-4 {
  padding: 1rem;
}

.text-center {
  text-align: center;
}

.text-lg {
  font-size: 1.125rem;
  line-height: 1.75rem;
}

.font-semibold {
  font-weight: 600;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.text-gray-500 {
  color: rgb(107 114 128);
}
</style>
