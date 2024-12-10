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
        :table-id="_tableId"
        :table-name="_tableName"
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
import type { TableState } from '../../tables/DataTable/types'
import { TableError } from '~/components/tables/DataTable/utils'
import type { ScheduleRow } from './types'
import { useScheduleTable } from './composables/useScheduleTable'
import type { BimColumnDef } from '~/composables/core/types/tables/column-types'
import { createBimColumnDefWithDefaults } from '~/composables/core/types/tables/column-types'
import type { SortEvent } from '~/composables/core/types/events/table-events'

// Props
interface Props {
  tableId: string
  tableName?: string
}

const props = withDefaults(defineProps<Props>(), {
  tableName: 'Schedule'
})

// Props with underscore prefix to avoid unused var warning
const _tableId = props.tableId
const _tableName = props.tableName

// State
const error = ref<Error | null>(null)
const isLoading = ref(false)
const scheduleData = ref<ScheduleRow[]>([])
const columns = ref<BimColumnDef[]>([])
const detailColumns = ref<BimColumnDef[]>([])
const initialState = ref<TableState | undefined>(undefined)

// Initialize schedule table
const { expandRow, collapseRow, reset } = useScheduleTable({
  tableId: _tableId,
  initialParentColumns: columns.value,
  initialChildColumns: detailColumns.value,
  onError: (err: TableError) => {
    error.value = new Error(err.message)
  }
})

// Event Handlers
async function handleExpandedRowsUpdate(rows: unknown): Promise<void> {
  try {
    if (!Array.isArray(rows)) return
    const validRows = rows.filter((row): row is ScheduleRow => 'name' in row)
    await Promise.all(
      validRows.map(async (row) => {
        await expandRow(row)
      })
    )
    scheduleData.value = validRows
  } catch (err) {
    handleError(err)
  }
}

function handleColumnsUpdate(newColumns: unknown): void {
  try {
    if (!Array.isArray(newColumns)) return
    const validColumns = newColumns.filter(
      (col): col is BimColumnDef =>
        typeof col === 'object' && col !== null && (col as BimColumnDef).kind === 'bim'
    )
    columns.value = validColumns
  } catch (err) {
    handleError(err)
  }
}

function handleDetailColumnsUpdate(newColumns: unknown): void {
  try {
    if (!Array.isArray(newColumns)) return
    const validColumns = newColumns.filter(
      (col): col is BimColumnDef =>
        typeof col === 'object' &&
        col !== null &&
        'kind' in col &&
        (col as { kind: string }).kind === 'bim'
    )
    detailColumns.value = validColumns
  } catch (err) {
    handleError(err)
  }
}

interface ColumnUpdates {
  parentColumns: unknown[]
  childColumns: unknown[]
}

function handleBothColumnsUpdate(updates: unknown): void {
  try {
    // Type guard for ColumnUpdates
    function isColumnUpdates(value: unknown): value is ColumnUpdates {
      return (
        typeof value === 'object' &&
        value !== null &&
        'parentColumns' in value &&
        'childColumns' in value &&
        Array.isArray((value as ColumnUpdates).parentColumns) &&
        Array.isArray((value as ColumnUpdates).childColumns)
      )
    }

    // Type guard for BimColumnDef
    function isBimColumnDef(value: unknown): value is BimColumnDef {
      return (
        typeof value === 'object' &&
        value !== null &&
        'kind' in value &&
        (value as BimColumnDef).kind === 'bim'
      )
    }

    if (!isColumnUpdates(updates)) return

    const validParentColumns = updates.parentColumns.filter(isBimColumnDef)
    const validChildColumns = updates.childColumns.filter(isBimColumnDef)

    columns.value = validParentColumns
    detailColumns.value = validChildColumns
  } catch (err) {
    handleError(err)
  }
}

function handleColumnReorder(event: unknown): void {
  try {
    if (
      !event ||
      typeof event !== 'object' ||
      !('dragIndex' in event) ||
      !('dropIndex' in event) ||
      typeof event.dragIndex !== 'number' ||
      typeof event.dropIndex !== 'number'
    ) {
      return
    }

    const reorderedColumns = [...columns.value]
    const [movedColumn] = reorderedColumns.splice(event.dragIndex, 1)
    if (movedColumn) {
      reorderedColumns.splice(event.dropIndex, 0, movedColumn)
      columns.value = reorderedColumns
    }
  } catch (err) {
    handleError(err)
  }
}

async function handleRowExpand(row: unknown): Promise<void> {
  try {
    if (typeof row === 'object' && row !== null && 'name' in row) {
      await expandRow(row as ScheduleRow)
    }
  } catch (err) {
    handleError(err)
  }
}

async function handleRowCollapse(row: unknown): Promise<void> {
  try {
    if (typeof row === 'object' && row !== null && 'name' in row) {
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

async function handleSort(event: unknown): Promise<void> {
  try {
    // Type guard for SortEvent
    function isSortEvent(value: unknown): value is SortEvent {
      return (
        typeof value === 'object' &&
        value !== null &&
        'field' in value &&
        'order' in value &&
        typeof (value as SortEvent).field === 'string' &&
        typeof (value as SortEvent).order === 'number'
      )
    }

    if (!isSortEvent(event)) return

    isLoading.value = true
    // Implement sorting logic here using event.field and event.order
    await new Promise((resolve) => setTimeout(resolve, 100)) // Placeholder for actual API call
  } catch (err) {
    handleError(err)
  } finally {
    isLoading.value = false
  }
}

async function handleFilter(filters: unknown): Promise<void> {
  try {
    if (!filters || typeof filters !== 'object') return
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
  const message = err instanceof Error ? err.message : 'An unknown error occurred'
  const tableError = new TableError(message, err)
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
      createBimColumnDefWithDefaults({
        id: 'name',
        name: 'Name',
        field: 'name',
        header: 'Name',
        type: 'string',
        visible: true,
        sourceValue: null,
        fetchedGroup: 'default',
        currentGroup: 'default',
        removable: false,
        order: 0
      }),
      createBimColumnDefWithDefaults({
        id: 'category',
        name: 'Category',
        field: 'category',
        header: 'Category',
        type: 'string',
        visible: true,
        sourceValue: null,
        fetchedGroup: 'default',
        currentGroup: 'default',
        removable: true,
        order: 1
      }),
      createBimColumnDefWithDefaults({
        id: 'kind',
        name: 'Kind',
        field: 'kind',
        header: 'Kind',
        type: 'string',
        visible: true,
        sourceValue: null,
        fetchedGroup: 'default',
        currentGroup: 'default',
        removable: true,
        order: 2
      })
    ]

    // Set initial detail columns
    detailColumns.value = [
      createBimColumnDefWithDefaults({
        id: 'sourceValue',
        name: 'Source Value',
        field: 'sourceValue',
        header: 'Source Value',
        type: 'string',
        visible: true,
        sourceValue: null,
        fetchedGroup: 'details',
        currentGroup: 'details',
        removable: true,
        order: 0
      }),
      createBimColumnDefWithDefaults({
        id: 'equation',
        name: 'Equation',
        field: 'equation',
        header: 'Equation',
        type: 'string',
        visible: true,
        sourceValue: null,
        fetchedGroup: 'details',
        currentGroup: 'details',
        removable: true,
        order: 1
      })
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
