<template>
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
    class="p-datatable-sm shadow-sm"
    :paginator="false"
    :rows="10"
    expand-mode="row"
    @update:expanded-rows="handleExpandedRowsUpdate"
    @column-resize-end="handleColumnResize"
    @column-reorder="handleColumnReorder"
    @sort="handleSort"
    @filter="handleFilter"
  >
    <template #empty>
      <slot name="empty" />
    </template>

    <template #loading>
      <slot name="loading" />
    </template>

    <template #expansion="slotProps">
      <div class="p-1">
        <DataTable
          :value="slotProps.data.details"
          resizable-columns
          reorderable-columns
          striped-rows
          class="nested-table"
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
          />
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
    />
  </DataTable>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type {
  DataTableColumnResizeEndEvent,
  DataTableColumnReorderEvent,
  DataTableSortEvent,
  DataTableFilterEvent,
  DataTableFilterMeta
} from 'primevue/datatable'
import type { ColumnDef } from '../../composables/types'

interface Props {
  modelValue: Record<string, unknown>[]
  data: Record<string, unknown>[]
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  loading?: boolean
  sortField?: string
  sortOrder?: number
  filters?: Record<string, unknown>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>[]]
  'column-resize': [event: { element: HTMLElement }]
  'column-reorder': [event: { target: HTMLElement | null }]
  sort: [field: string, order: number]
  filter: [filters: Record<string, unknown>]
}>()

const sortedParentColumns = computed(() =>
  [...props.parentColumns]
    .filter((col) => col.visible)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
)

const sortedChildColumns = computed(() =>
  [...props.childColumns]
    .filter((col) => col.visible)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
)

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
    minWidth: '100px'
  }
}

function handleExpandedRowsUpdate(value: unknown) {
  if (Array.isArray(value)) {
    emit('update:modelValue', value as Record<string, unknown>[])
  }
}

function handleColumnResize(event: DataTableColumnResizeEndEvent) {
  if (event && 'element' in event && event.element instanceof HTMLElement) {
    emit('column-resize', { element: event.element })
  }
}

function handleColumnReorder(event: DataTableColumnReorderEvent) {
  if (event && 'target' in event) {
    const target = event.target instanceof HTMLElement ? event.target : null
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
    emit('filter', filters)
  }
}
</script>

<style scoped>
.nested-table {
  margin: 0;
}

:deep(.p-datatable-expanded-row > td) {
  padding: 0 !important;
}

:deep(.p-datatable-expanded-row .p-datatable) {
  margin: 0 !important;
}

:deep(.p-datatable-expanded-row .p-datatable .p-datatable-thead > tr > th) {
  background-color: #f8f9fa;
}

:deep(.p-datatable .p-datatable-thead > tr > th) {
  transition: width 0.2s ease;
}

:deep(.p-datatable .p-datatable-tbody > tr > td) {
  transition: width 0.2s ease;
}
</style>
