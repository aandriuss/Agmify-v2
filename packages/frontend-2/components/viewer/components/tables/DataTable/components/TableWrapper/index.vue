<template>
  <div class="datatable-wrapper">
    <DataTable
      :expanded-rows="modelValue"
      :value="data"
      :loading="loading"
      :sort-field="sortField"
      :sort-order="sortOrder"
      :filters="tableFilters"
      resizable-columns
      reorderable-columns
      striped-rows
      class="p-datatable-sm"
      :paginator="false"
      :rows="10"
      expand-mode="row"
      data-key="id"
      @update:expanded-rows="handleExpandedRowsUpdate"
      @column-resize-end="handleColumnResize"
      @column-reorder="handleColumnReorder"
      @sort="handleSort"
      @filter="handleFilter"
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

      <template #expansion="slotProps">
        <div class="p-2 bg-gray-50">
          <DataTable
            :value="slotProps.data.details"
            resizable-columns
            reorderable-columns
            striped-rows
            class="nested-table p-datatable-sm"
            data-key="id"
            @column-resize-end="handleColumnResize"
            @column-reorder="handleColumnReorder"
          >
            <Column :expander="true" style="width: 3rem" />
            <Column
              v-for="col in sortedChildColumns"
              :key="col.field"
              :field="col.field"
              :header="col.header"
              :data-field="col.field"
              :style="getColumnStyle(col)"
              sortable
            >
              <template #body="{ data }">
                <div class="truncate">{{ data[col.field] }}</div>
              </template>
            </Column>
          </DataTable>
        </div>
      </template>

      <Column :expander="true" style="width: 3rem" />
      <Column
        v-for="col in sortedParentColumns"
        :key="col.field"
        :field="col.field"
        :header="col.header"
        :header-component="col.headerComponent"
        :data-field="col.field"
        :style="getColumnStyle(col)"
        sortable
      >
        <template #body="{ data }">
          <div class="truncate">{{ data[col.field] }}</div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type {
  DataTableColumnResizeEndEvent,
  DataTableColumnReorderEvent,
  DataTableSortEvent,
  DataTableFilterEvent,
  DataTableFilterMeta
} from 'primevue/datatable'
import type { ColumnDef } from '../../composables/columns/types'
import type { TableRowData } from '~/components/viewer/schedules/types'
import { debug } from '~/components/viewer/schedules/utils/debug'

interface Props {
  modelValue: TableRowData[]
  data: TableRowData[]
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  loading?: boolean
  sortField?: string
  sortOrder?: number
  filters?: Record<string, unknown>
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: TableRowData[]]
  'column-resize': [event: { element: HTMLElement }]
  'column-reorder': [event: { target: HTMLElement | null }]
  sort: [field: string, order: number]
  filter: [filters: Record<string, unknown>]
}>()

// Debug incoming props
watch(
  () => props.data,
  (newData: TableRowData[]) => {
    debug.log('TableWrapper data changed:', {
      rowCount: newData.length,
      firstRow: newData[0],
      firstRowDetails: newData[0]?.details,
      withDetails: newData.filter(
        (row) => Array.isArray(row.details) && row.details.length > 0
      ).length,
      detailsExample: newData[0]?.details?.[0]
    })
  },
  { immediate: true }
)

watch(
  () => props.modelValue,
  (newValue: TableRowData[]) => {
    debug.log('TableWrapper expanded rows changed:', {
      expandedCount: newValue.length,
      firstExpanded: newValue[0],
      firstExpandedDetails: newValue[0]?.details
    })
  },
  { immediate: true }
)

watch(
  () => props.parentColumns,
  (newColumns: ColumnDef[]) => {
    debug.log('TableWrapper parent columns changed:', {
      columnCount: newColumns.length,
      visibleColumns: newColumns.filter((col) => col.visible).length,
      fields: newColumns.map((col) => col.field)
    })
  },
  { immediate: true }
)

watch(
  () => props.childColumns,
  (newColumns: ColumnDef[]) => {
    debug.log('TableWrapper child columns changed:', {
      columnCount: newColumns.length,
      visibleColumns: newColumns.filter((col) => col.visible).length,
      fields: newColumns.map((col) => col.field)
    })
  },
  { immediate: true }
)

const sortedParentColumns = computed(() => {
  const columns = [...props.parentColumns]
    .filter((col) => col.visible)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
  debug.log('Sorted parent columns:', {
    columnCount: columns.length,
    fields: columns.map((col) => col.field),
    firstColumn: columns[0]
  })
  return columns
})

const sortedChildColumns = computed(() => {
  const columns = [...props.childColumns]
    .filter((col) => col.visible)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
  debug.log('Sorted child columns:', {
    columnCount: columns.length,
    fields: columns.map((col) => col.field),
    firstColumn: columns[0]
  })
  return columns
})

const tableFilters = computed(() => {
  if (!props.filters) return {}
  return Object.entries(props.filters).reduce((acc, [key, value]) => {
    acc[key] = { value, matchMode: 'contains' }
    return acc
  }, {} as Record<string, { value: unknown; matchMode: string }>)
})

function getColumnStyle(col: ColumnDef) {
  return {
    width: col.width ? `${col.width}px` : 'auto',
    minWidth: '100px',
    maxWidth: col.width ? `${col.width}px` : 'none',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  }
}

function handleExpandedRowsUpdate(value: unknown) {
  debug.log('Expanded rows update:', {
    value,
    isArray: Array.isArray(value),
    length: Array.isArray(value) ? value.length : 0
  })
  if (Array.isArray(value)) {
    emit('update:modelValue', value as TableRowData[])
  }
}

function handleColumnResize(event: DataTableColumnResizeEndEvent) {
  if (event && 'element' in event && event.element instanceof HTMLElement) {
    const field = event.element.dataset.field
    const width = event.element.offsetWidth
    debug.log('Column resize:', { field, width })
    emit('column-resize', { element: event.element })
  }
}

function handleColumnReorder(event: DataTableColumnReorderEvent) {
  if (event && 'target' in event) {
    const target = event.target instanceof HTMLElement ? event.target : null
    const field = target?.dataset.field
    debug.log('Column reorder:', { field, target: target?.outerHTML })
    emit('column-reorder', { target })
  }
}

function handleSort(event: DataTableSortEvent) {
  if (
    event &&
    'field' in event &&
    'order' in event &&
    typeof event.order === 'number'
  ) {
    debug.log('Sort:', { field: event.field, order: event.order })
    emit('sort', event.field as string, event.order)
  }
}

function handleFilter(event: DataTableFilterEvent) {
  if (event && 'filters' in event) {
    const filters = Object.entries(event.filters as DataTableFilterMeta).reduce(
      (acc, [key, meta]) => {
        if (meta && typeof meta === 'object' && 'value' in meta) {
          acc[key] = meta.value
        }
        return acc
      },
      {} as Record<string, unknown>
    )
    debug.log('Filter:', filters)
    emit('filter', filters)
  }
}
</script>

<style scoped>
.datatable-wrapper {
  width: 100%;
  overflow-x: auto;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgb(0 0 0 / 10%);
}

.nested-table {
  margin: 0;
  border-radius: 0.25rem;
  overflow: hidden;
}

:deep(.p-datatable) {
  font-family: inherit;
  font-size: 0.875rem;
  line-height: 1.25rem;
}

:deep(.p-datatable-header) {
  background-color: #f8f9fa;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid #e9ecef;
}

:deep(.p-datatable-thead > tr > th) {
  background-color: #f8f9fa;
  padding: 0.5rem;
  border-bottom: 1px solid #e9ecef;
  font-weight: 600;
  color: #495057;
  transition: width 0.2s ease;
}

:deep(.p-datatable-tbody > tr > td) {
  padding: 0.5rem;
  border-bottom: 1px solid #e9ecef;
  transition: width 0.2s ease;
}

:deep(.p-datatable-tbody > tr:hover) {
  background-color: #f8f9fa;
}

:deep(.p-datatable-expanded-row > td) {
  padding: 0 !important;
  background-color: #f8f9fa;
}

:deep(.p-datatable-expanded-row .p-datatable) {
  margin: 0 !important;
}

:deep(.p-datatable-expanded-row .p-datatable .p-datatable-thead > tr > th) {
  background-color: #f1f3f5;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
