<template>
  <div class="table-wrapper">
    <DataTable
      :value="data"
      :expanded-rows="expandedRows"
      :loading="loading"
      :resizable-columns="true"
      :reorderable-columns="true"
      :sort-field="sortField"
      :sort-order="sortOrder"
      :filters="filters"
      :row-hover="true"
      :scrollable="true"
      :scroll-height="scrollHeight"
      class="p-datatable-sm"
      @update:expanded-rows="handleExpandedRowsUpdate"
      @column-resize="handleColumnResize"
      @column-reorder="handleColumnReorder"
      @sort="handleSort"
      @filter="handleFilter"
      @row-expand="handleRowExpand"
      @row-collapse="handleRowCollapse"
    >
      <!-- Dynamic Columns -->
      <Column
        v-for="col in visibleColumns"
        :key="col.id"
        :field="col.field"
        :header="col.header"
        :sortable="true"
        :resizable="true"
        :reorderable="true"
        :data-field="col.field"
      >
        <template #body="{ data: rowData }">
          <slot
            :name="col.field"
            :row="rowData"
            :value="getFieldValue(rowData, col.field)"
            :column="col"
          >
            {{ formatCellValue(getFieldValue(rowData, col.field), col.type) }}
          </slot>
        </template>
      </Column>

      <!-- Expansion Template -->
      <template #expansion="{ data: rowData }">
        <slot name="expansion" :row="rowData">
          <div class="p-3">
            <DataTable
              v-if="detailColumns && detailColumns.length"
              :value="rowData.details || []"
              :loading="loading"
              class="nested-table"
            >
              <Column
                v-for="col in visibleDetailColumns"
                :key="col.id"
                :field="col.field"
                :header="col.header"
                :sortable="true"
              >
                <template #body="{ data: detailData }">
                  <slot
                    :name="`detail-${col.field}`"
                    :row="detailData"
                    :value="getFieldValue(detailData, col.field)"
                    :column="col"
                  >
                    {{
                      formatCellValue(getFieldValue(detailData, col.field), col.type)
                    }}
                  </slot>
                </template>
              </Column>
            </DataTable>
          </div>
        </slot>
      </template>

      <!-- Empty Template -->
      <template #empty>
        <slot name="empty">
          <div class="p-4 text-center text-gray-500">No data available</div>
        </slot>
      </template>

      <!-- Loading Template -->
      <template #loading>
        <slot name="loading">
          <div class="p-4 text-center text-gray-500">Loading data...</div>
        </slot>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type { TableWrapperProps, BaseTableRow } from '../../types'
import {
  getFieldValue,
  formatCellValue,
  getVisibleColumns,
  TableError
} from '../../utils'

// Import PrimeVue types
import type { DataTableSortEvent, DataTableFilterEvent } from 'primevue/datatable'

const props = withDefaults(defineProps<TableWrapperProps>(), {
  loading: false
})

const emit = defineEmits<{
  'update:expanded-rows': [rows: BaseTableRow[]]
  'column-resize': [event: { element: HTMLElement }]
  'column-reorder': [event: { dragIndex: number; dropIndex: number }]
  sort: [field: string, order: number]
  filter: [filters: Record<string, { value: unknown; matchMode: string }>]
  'row-expand': [row: BaseTableRow]
  'row-collapse': [row: BaseTableRow]
  error: [error: TableError]
}>()

// Computed
const visibleColumns = computed(() => getVisibleColumns(props.columns))
const visibleDetailColumns = computed(() =>
  props.detailColumns ? getVisibleColumns(props.detailColumns) : []
)

// Responsive scroll height
const scrollHeight = ref('400px')

// Event Handlers
function handleExpandedRowsUpdate(value: unknown): void {
  try {
    if (Array.isArray(value)) {
      const rows = value.filter((row): row is BaseTableRow => {
        if (!row || typeof row !== 'object') return false
        return 'id' in row && typeof (row as BaseTableRow).id === 'string'
      })
      emit('update:expanded-rows', rows)
    }
  } catch (error) {
    emit('error', new TableError('Failed to update expanded rows', error))
  }
}

function handleColumnResize(event: { element: HTMLElement }): void {
  try {
    emit('column-resize', event)
  } catch (error) {
    emit('error', new TableError('Failed to handle column resize', error))
  }
}

function handleColumnReorder(event: { dragIndex: number; dropIndex: number }): void {
  try {
    emit('column-reorder', event)
  } catch (error) {
    emit('error', new TableError('Failed to handle column reorder', error))
  }
}

function handleSort(event: DataTableSortEvent): void {
  try {
    if (typeof event.sortField === 'string' && typeof event.sortOrder === 'number') {
      emit('sort', event.sortField, event.sortOrder)
    }
  } catch (error) {
    emit('error', new TableError('Failed to handle sort', error))
  }
}

function handleFilter(event: DataTableFilterEvent): void {
  try {
    const filters = event.filters as Record<
      string,
      { value: unknown; matchMode: string }
    >
    emit('filter', filters)
  } catch (error) {
    emit('error', new TableError('Failed to handle filter', error))
  }
}

function handleRowExpand(event: { data: BaseTableRow }): void {
  try {
    emit('row-expand', event.data)
  } catch (error) {
    emit('error', new TableError('Failed to handle row expand', error))
  }
}

function handleRowCollapse(event: { data: BaseTableRow }): void {
  try {
    emit('row-collapse', event.data)
  } catch (error) {
    emit('error', new TableError('Failed to handle row collapse', error))
  }
}

onMounted(() => {
  // Adjust scroll height based on viewport
  const vh = window.innerHeight
  scrollHeight.value = `${Math.max(400, vh - 300)}px`
})
</script>

<style scoped>
.table-wrapper {
  width: 100%;
  overflow: hidden;
}

.nested-table {
  background: var(--surface-ground);
  border-radius: 4px;
}

:deep(.p-datatable-wrapper) {
  border-radius: 4px;
}

:deep(.p-datatable-header) {
  background: var(--surface-section);
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
}

:deep(.p-datatable-footer) {
  background: var(--surface-section);
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
}
</style>
