<template>
  <div class="schedule-main-view">
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold">Schedule View</h2>
      <p class="text-gray-600">
        Manage and view schedule parameters with filtering and grouping capabilities.
      </p>
    </div>

    <!-- Main Content -->
    <div class="schedule-content">
      <ScheduleTable
        :table-id="tableId"
        :table-name="tableName"
        :data="scheduleData"
        :columns="columns"
        :detail-columns="detailColumns"
        :loading="isLoading"
        :initial-state="initialState"
        @update:expanded-rows="handleExpandedRowsUpdate"
        @update:columns="handleColumnsUpdate"
        @update:detail-columns="handleDetailColumnsUpdate"
        @update:both-columns="handleBothColumnsUpdate"
        @column-reorder="handleColumnReorder"
        @row-expand="handleRowExpand"
        @row-collapse="handleRowCollapse"
        @table-updated="handleTableUpdated"
        @column-visibility-change="handleColumnVisibilityChange"
        @sort="handleSort"
        @filter="handleFilter"
        @create-parameter="handleCreateParameter"
        @edit-parameters="handleEditParameters"
        @error="handleError"
        @retry="handleRetry"
      />
    </div>

    <!-- Error Display -->
    <div
      v-if="error"
      class="fixed bottom-4 right-4 p-4 bg-red-50 text-red-600 rounded shadow-lg"
    >
      {{ error.message }}
      <button class="ml-2 text-sm underline hover:text-red-700" @click="handleRetry">
        Retry
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ScheduleTable from './ScheduleTable.vue'
import type {
  TableColumnDef,
  BaseTableRow,
  TableState
} from '../../core/tables/DataTable/types'
import { TableError } from '../../core/tables/DataTable/utils'
import type { ScheduleRow } from './types'
import { useScheduleTable } from './composables/useScheduleTable'

// Props
interface Props {
  tableId: string
  tableName?: string
}

const props = withDefaults(defineProps<Props>(), {
  tableName: 'Schedule'
})

// State
const error = ref<Error | null>(null)
const isLoading = ref(false)
const scheduleData = ref<ScheduleRow[]>([])
const columns = ref<TableColumnDef[]>([])
const detailColumns = ref<TableColumnDef[]>([])
const initialState = ref<TableState | undefined>(undefined)

// Initialize schedule table
const { expandRow, collapseRow, reset } = useScheduleTable({
  tableId: props.tableId,
  initialParentColumns: columns.value,
  initialChildColumns: detailColumns.value,
  onError: (err: TableError) => {
    error.value = new Error(err.message)
  }
})

// Event Handlers
async function handleExpandedRowsUpdate(rows: BaseTableRow[]): Promise<void> {
  try {
    const validRows = rows.filter((row): row is ScheduleRow => 'name' in row)
    await Promise.all(
      validRows.map(async (row) => {
        // Perform any async operations needed for each row
        await expandRow(row)
      })
    )
    scheduleData.value = validRows
  } catch (err) {
    handleError(err)
  }
}

function handleColumnsUpdate(newColumns: TableColumnDef[]): void {
  try {
    columns.value = newColumns
  } catch (err) {
    handleError(err)
  }
}

function handleDetailColumnsUpdate(newColumns: TableColumnDef[]): void {
  try {
    detailColumns.value = newColumns
  } catch (err) {
    handleError(err)
  }
}

function handleBothColumnsUpdate(updates: {
  parentColumns: TableColumnDef[]
  childColumns: TableColumnDef[]
}): void {
  try {
    columns.value = updates.parentColumns
    detailColumns.value = updates.childColumns
  } catch (err) {
    handleError(err)
  }
}

function handleColumnReorder(event: { dragIndex: number; dropIndex: number }): void {
  try {
    const reorderedColumns = [...columns.value]
    const [movedColumn] = reorderedColumns.splice(event.dragIndex, 1)
    reorderedColumns.splice(event.dropIndex, 0, movedColumn)
    columns.value = reorderedColumns
  } catch (err) {
    handleError(err)
  }
}

async function handleRowExpand(row: BaseTableRow): Promise<void> {
  try {
    if ('name' in row) {
      await expandRow(row as ScheduleRow)
    }
  } catch (err) {
    handleError(err)
  }
}

async function handleRowCollapse(row: BaseTableRow): Promise<void> {
  try {
    if ('name' in row) {
      await collapseRow(row as ScheduleRow)
    }
  } catch (err) {
    handleError(err)
  }
}

function handleTableUpdated(): void {
  // Emit event to parent if needed
}

function handleColumnVisibilityChange(): void {
  // Emit event to parent if needed
}

async function handleSort(_field: string, _order: number): Promise<void> {
  try {
    isLoading.value = true
    // Implement sorting logic here
    await new Promise((resolve) => setTimeout(resolve, 100)) // Placeholder for actual API call
  } catch (err) {
    handleError(err)
  } finally {
    isLoading.value = false
  }
}

async function handleFilter(
  _filters: Record<string, { value: unknown; matchMode: string }>
): Promise<void> {
  try {
    isLoading.value = true
    // Implement filtering logic here
    await new Promise((resolve) => setTimeout(resolve, 100)) // Placeholder for actual API call
  } catch (err) {
    handleError(err)
  } finally {
    isLoading.value = false
  }
}

async function handleCreateParameter(): Promise<void> {
  try {
    isLoading.value = true
    // Implement parameter creation logic here
    await new Promise((resolve) => setTimeout(resolve, 100)) // Placeholder for actual API call
  } catch (err) {
    handleError(err)
  } finally {
    isLoading.value = false
  }
}

async function handleEditParameters(): Promise<void> {
  try {
    isLoading.value = true
    // Implement parameter editing logic here
    await new Promise((resolve) => setTimeout(resolve, 100)) // Placeholder for actual API call
  } catch (err) {
    handleError(err)
  } finally {
    isLoading.value = false
  }
}

function handleError(err: unknown): void {
  const tableError = new TableError(
    err instanceof Error ? err.message : 'An unknown error occurred',
    err
  )
  error.value = new Error(tableError.message)
}

async function handleRetry(): Promise<void> {
  try {
    error.value = null
    isLoading.value = true
    await reset()
    await initialize()
  } catch (err) {
    handleError(err)
  } finally {
    isLoading.value = false
  }
}

// Initialize component
async function initialize(): Promise<void> {
  try {
    isLoading.value = true
    // Load initial data
    await new Promise((resolve) => setTimeout(resolve, 100)) // Placeholder for actual API call

    // Set initial columns
    columns.value = [
      {
        id: 'name',
        name: 'Name',
        field: 'name',
        header: 'Name',
        type: 'text',
        visible: true,
        currentGroup: 'default',
        removable: false,
        order: 0
      },
      {
        id: 'category',
        name: 'Category',
        field: 'category',
        header: 'Category',
        type: 'text',
        visible: true,
        currentGroup: 'default',
        removable: true,
        order: 1
      },
      {
        id: 'kind',
        name: 'Kind',
        field: 'kind',
        header: 'Kind',
        type: 'text',
        visible: true,
        currentGroup: 'default',
        removable: true,
        order: 2
      }
    ]

    // Set initial detail columns
    detailColumns.value = [
      {
        id: 'sourceValue',
        name: 'Source Value',
        field: 'sourceValue',
        header: 'Source Value',
        type: 'text',
        visible: true,
        currentGroup: 'details',
        removable: true,
        order: 0
      },
      {
        id: 'equation',
        name: 'Equation',
        field: 'equation',
        header: 'Equation',
        type: 'text',
        visible: true,
        currentGroup: 'details',
        removable: true,
        order: 1
      }
    ]

    // Set initial data
    scheduleData.value = []
  } catch (err) {
    handleError(err)
  } finally {
    isLoading.value = false
  }
}

// Call initialize on component mount
initialize()
</script>

<style scoped>
.schedule-main-view {
  @apply p-6;
}

.schedule-content {
  @apply bg-white rounded-lg shadow;
}
</style>
