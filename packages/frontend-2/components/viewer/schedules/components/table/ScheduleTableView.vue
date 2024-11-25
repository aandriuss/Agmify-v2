<template>
  <div>
    <!-- Loading State -->
    <ScheduleLoadingState
      v-if="isLoading && !hasData"
      loading-message="Loading schedule data..."
      loading-detail="Please wait while we prepare your data"
      :current-step="1"
      :total-steps="1"
    />

    <!-- Error State -->
    <ScheduleErrorState
      v-else-if="loadingError && !hasData"
      :error="loadingError"
      :show-debug="showDebug"
      @retry="reloadPage"
      @show-debug="showDebug = !showDebug"
    />

    <!-- Table -->
    <DataTable
      v-else-if="hasData"
      :key="`${tableKey}-${tableData.length}-${parentVisibleColumns.length}`"
      :table-id="currentTableId"
      :table-name="tableName"
      :data="tableData"
      :schedule-data="scheduleData"
      :columns="parentVisibleColumns"
      :detail-columns="childVisibleColumns"
      :available-parent-parameters="store.availableHeaders.value?.parent || []"
      :available-child-parameters="store.availableHeaders.value?.child || []"
      :loading="isLoadingAdditionalData"
      :initial-state="tableState"
      @update:both-columns="emit('update:both-columns', $event)"
      @update:expanded-rows="updateExpandedRows"
      @row-expand="handleRowExpand"
      @row-collapse="handleRowCollapse"
      @table-updated="emit('table-updated')"
      @column-visibility-change="emit('column-visibility-change')"
      @error="emit('error', $event)"
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
import type { TableConfig, TableRow, ElementData } from '../../types'
import { useDebug, DebugCategories } from '../../debug/useDebug'
import { useStore } from '../../core/store'

// Import local components
import ScheduleLoadingState from './ScheduleLoadingState.vue'
import ScheduleErrorState from './ScheduleErrorState.vue'

// Group related props into interfaces
interface TableProps {
  selectedTableId: string
  currentTable: TableConfig | null
  tableName: string
  currentTableId: string
  tableKey: string
}

interface ColumnProps {
  parentBaseColumns: ColumnDef[]
  parentAvailableColumns: ColumnDef[]
  parentVisibleColumns: ColumnDef[]
  childBaseColumns: ColumnDef[]
  childAvailableColumns: ColumnDef[]
  childVisibleColumns: ColumnDef[]
}

interface DataProps {
  scheduleData: ElementData[]
  evaluatedData: ElementData[]
  tableData: TableRow[]
}

interface StateProps {
  isInitialized: boolean
  isLoading: boolean
  isLoadingAdditionalData: boolean
  loadingError: Error | null
  noCategoriesSelected: boolean
  selectedParentCategories: string[]
  selectedChildCategories: string[]
}

const props = withDefaults(
  defineProps<TableProps & ColumnProps & DataProps & StateProps>(),
  {
    loadingError: null
  }
)

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

const debug = useDebug()
const store = useStore()
const showDebug = ref(true)
const expandedRows = ref<(TableRow | ElementData)[]>([])

const hasData = computed(() => {
  const isReady =
    props.isInitialized &&
    props.tableData.length > 0 &&
    props.parentVisibleColumns.length > 0

  debug.log(DebugCategories.TABLE_DATA, 'Table data status', {
    initialized: props.isInitialized,
    dataCount: props.tableData.length,
    columnCount: props.parentVisibleColumns.length,
    isReady,
    availableParentParams: store.availableHeaders.value?.parent.length || 0,
    availableChildParams: store.availableHeaders.value?.child.length || 0
  })

  return isReady
})

const tableState = computed(() => ({
  columns: props.parentVisibleColumns,
  detailColumns: props.childVisibleColumns,
  expandedRows: expandedRows.value,
  sortField: 'mark',
  sortOrder: 1,
  filters: {}
}))

// Event handlers
function updateExpandedRows(rows: (TableRow | ElementData)[]): void {
  expandedRows.value = rows
  debug.log(DebugCategories.TABLE_DATA, 'Updated expanded rows', {
    count: rows.length,
    marks: rows.map((row) => row.mark)
  })
}

function handleRowExpand(row: TableRow | ElementData): void {
  debug.log(DebugCategories.TABLE_DATA, 'Row expanded', {
    mark: row.mark,
    hasDetails: 'details' in row
  })
  emit('row-expand', row)
}

function handleRowCollapse(row: TableRow | ElementData): void {
  debug.log(DebugCategories.TABLE_DATA, 'Row collapsed', {
    mark: row.mark,
    hasDetails: 'details' in row
  })
  emit('row-collapse', row)
}

// Utility functions
function reloadPage(): void {
  // Using location.reload() for browser reload
  if (typeof location !== 'undefined') {
    location.reload()
  }
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
