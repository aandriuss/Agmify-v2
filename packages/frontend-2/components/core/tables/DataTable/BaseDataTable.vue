<template>
  <div class="base-data-table">
    <!-- Column Management -->
    <div class="flex items-center gap-2 mb-3">
      <FormButton color="outline" @click="openDialog">Manage Columns</FormButton>
      <span v-if="isSaving" class="text-sm text-gray-500">Saving changes...</span>
    </div>

    <!-- Column Manager Dialog -->
    <ColumnManager
      v-if="dialogOpen"
      :open="dialogOpen"
      :table-id="tableId"
      :table-name="tableName"
      :columns="localColumns"
      :detail-columns="localDetailColumns"
      @update:open="dialogOpen = $event"
      @update:columns="handleColumnsUpdate"
      @cancel="handleCancel"
      @apply="handleApplyColumns"
    />

    <!-- Main Table -->
    <TableWrapper
      v-if="isInitialized"
      :key="`${tableKey}`"
      :data="data"
      :expanded-rows="expandedRows"
      :columns="localColumns"
      :detail-columns="localDetailColumns"
      :loading="loading || !isInitialized"
      :sort-field="sortField"
      :sort-order="sortOrder"
      :filters="filters"
      @update:expanded-rows="handleExpandedRowsUpdate"
      @column-resize="handleColumnResize"
      @column-reorder="handleColumnReorder"
      @sort="handleSort"
      @filter="handleFilter"
      @row-expand="handleRowExpand"
      @row-collapse="handleRowCollapse"
      @table-updated="$emit('table-updated')"
      @column-visibility-change="$emit('column-visibility-change')"
      @error="handleError"
    >
      <template #empty>
        <slot name="empty">
          <div class="p-4 text-center text-gray-500">No data available</div>
        </slot>
      </template>

      <template #loading>
        <slot name="loading">
          <div class="p-4 text-center text-gray-500">Loading data...</div>
        </slot>
      </template>

      <template #error>
        <slot name="error">
          <div class="p-4 text-center text-red-500">{{ errorMessage }}</div>
        </slot>
      </template>
    </TableWrapper>

    <!-- Loading placeholder -->
    <div v-else class="p-4 text-center text-gray-500">Initializing table...</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { FormButton } from '@speckle/ui-components'
import type { DataTableFilterMeta } from 'primevue/datatable'
import type {
  BaseTableRow,
  TableColumnDef,
  TableProps,
  TableEvents,
  ColumnUpdateEvent
} from './types'
import {
  safeJSONClone,
  sortColumnsByOrder,
  updateLocalColumns,
  validateTableRows,
  ensureColumnProperties
} from './utils'
import ColumnManager from './components/ColumnManager/index.vue'
import TableWrapper from './components/TableWrapper/index.vue'
import { useTableConfigs } from '~/composables/useTableConfigs'

// Props
const props = withDefaults(defineProps<TableProps>(), {
  tableName: 'Default',
  loading: false
})

// Emits
const emit = defineEmits<TableEvents>()

// State
const dialogOpen = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const isInitialized = ref(false)

const expandedRowsState = ref<BaseTableRow[]>([])
const sortField = ref<string>('')
const sortOrder = ref<number>(1)
const filters = ref<DataTableFilterMeta>({})

// Column State
const localColumns = ref<TableColumnDef[]>([])
const localDetailColumns = ref<TableColumnDef[]>([])
const tempColumns = ref<TableColumnDef[]>([])
const tempDetailColumns = ref<TableColumnDef[]>([])

// Initialize table configs
const tableConfigs = useTableConfigs()

// Computed
const tableKey = computed(() => {
  return `${props.tableId}-${props.data.length}-${localColumns.value.length}-${localDetailColumns.value.length}`
})

const expandedRows = computed<BaseTableRow[]>({
  get: () => expandedRowsState.value,
  set: (value) => {
    if (Array.isArray(value)) {
      const validRows = validateTableRows(value)
      expandedRowsState.value = validRows
      emit('update:expandedRows', validRows)
    }
  }
})

// Error Handler
function handleError(error: Error | unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  errorMessage.value = message
  emit('error', new Error(message))
}

// Event Handlers
function openDialog(): void {
  try {
    tempColumns.value = safeJSONClone(localColumns.value)
    tempDetailColumns.value = safeJSONClone(localDetailColumns.value)
    dialogOpen.value = true
  } catch (error) {
    handleError(error)
  }
}

function handleColumnsUpdate(updates: ColumnUpdateEvent): void {
  tempColumns.value = safeJSONClone(
    updates.parentColumns.map((col) => ensureColumnProperties(col))
  )
  tempDetailColumns.value = safeJSONClone(
    updates.childColumns.map((col) => ensureColumnProperties(col))
  )
}

async function handleApplyColumns(): Promise<void> {
  try {
    isSaving.value = true

    // Update local state
    localColumns.value = safeJSONClone(tempColumns.value)
    localDetailColumns.value = safeJSONClone(tempDetailColumns.value)

    // Update table configs
    if (props.tableId) {
      await tableConfigs.updateTableColumns(
        props.tableId,
        localColumns.value,
        localDetailColumns.value
      )
    }

    // Emit updates
    emit('update:both-columns', {
      parentColumns: localColumns.value,
      childColumns: localDetailColumns.value
    })

    dialogOpen.value = false
  } catch (error) {
    handleError(error)
  } finally {
    isSaving.value = false
  }
}

function handleCancel(): void {
  tempColumns.value = safeJSONClone(localColumns.value)
  tempDetailColumns.value = safeJSONClone(localDetailColumns.value)
  dialogOpen.value = false
}

function handleExpandedRowsUpdate(rows: unknown[]): void {
  if (Array.isArray(rows)) {
    const validRows = validateTableRows(rows)
    expandedRowsState.value = validRows
    emit('update:expandedRows', validRows)
  }
}

function handleRowExpand(row: BaseTableRow): void {
  emit('row-expand', row)
}

function handleRowCollapse(row: BaseTableRow): void {
  emit('row-collapse', row)
}

function handleColumnResize(event: { element: HTMLElement }): void {
  try {
    const field = event.element.dataset.field
    const width = event.element.offsetWidth

    const updateColumnWidth = (columns: TableColumnDef[]) => {
      const column = columns.find((col) => col.field === field)
      if (column) {
        column.width = width
      }
    }

    updateColumnWidth(localColumns.value)
    updateColumnWidth(localDetailColumns.value)

    emit('update:both-columns', {
      parentColumns: localColumns.value,
      childColumns: localDetailColumns.value
    })
  } catch (error) {
    handleError(error)
  }
}

function handleColumnReorder(event: { dragIndex: number; dropIndex: number }): void {
  try {
    isSaving.value = true

    const reorderedColumns = [...localColumns.value]
    const [movedColumn] = reorderedColumns.splice(event.dragIndex, 1)
    reorderedColumns.splice(event.dropIndex, 0, movedColumn)

    // Update order property
    const updatedColumns = reorderedColumns.map((col, index) => ({
      ...col,
      order: index
    }))

    localColumns.value = updatedColumns
    emit('update:columns', updatedColumns)
    emit('column-reorder', event)
  } catch (error) {
    handleError(error)
  } finally {
    isSaving.value = false
  }
}

function handleSort(field: string, order: number): void {
  sortField.value = field
  sortOrder.value = order
  emit('sort', field, order)
}

function handleFilter(newFilters: DataTableFilterMeta): void {
  filters.value = newFilters
  emit('filter', newFilters)
}

// Initialization
async function initializeState(): Promise<void> {
  try {
    if (props.initialState) {
      // Initialize columns with proper defaults
      const initialColumns = props.initialState.columns.map((col) =>
        ensureColumnProperties(col)
      )
      localColumns.value = safeJSONClone(sortColumnsByOrder(initialColumns))

      // Initialize detail columns if present
      if (props.initialState.detailColumns) {
        const initialDetailColumns = props.initialState.detailColumns.map((col) =>
          ensureColumnProperties(col)
        )
        localDetailColumns.value = safeJSONClone(
          sortColumnsByOrder(initialDetailColumns)
        )
      }

      // Set initial expanded rows with validation
      const validRows = validateTableRows(props.initialState.expandedRows)
      expandedRowsState.value = validRows

      sortField.value = props.initialState.sortField || ''
      sortOrder.value = props.initialState.sortOrder || 1
      filters.value = props.initialState.filters || {}
    } else {
      // Initialize from props with proper defaults
      updateLocalColumns(
        props.columns.map((col) => ensureColumnProperties(col)),
        (cols) => (localColumns.value = cols)
      )
      if (props.detailColumns) {
        updateLocalColumns(
          props.detailColumns.map((col) => ensureColumnProperties(col)),
          (cols) => (localDetailColumns.value = cols)
        )
      }
    }

    // Initialize table configs
    await tableConfigs.initialize()

    // Wait for next tick to ensure data is ready
    await nextTick()
    isInitialized.value = true
  } catch (error) {
    handleError(error)
  }
}

// Watch for data changes
watch(
  () => props.data,
  async (newData) => {
    // If we have data but aren't initialized, initialize now
    if (newData.length > 0 && !isInitialized.value) {
      await initializeState()
    }
  },
  { deep: true, immediate: true }
)

// Initialization
onMounted(async () => {
  try {
    // Only initialize if we don't already have data
    // (the watcher will handle initialization if data arrives later)
    if (props.data.length === 0) {
      await initializeState()
    }
  } catch (error) {
    handleError(error)
  }
})
</script>

<style scoped>
.base-data-table {
  --primary-color: #3b82f6;
  --surface-ground: #f8f9fa;
  --surface-section: #fff;
  --surface-card: #fff;
  --surface-border: #dfe7ef;
  --text-color: #495057;
  --text-color-secondary: #6c757d;
}
</style>
