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
        <div class="p-4 text-center text-gray-500">No data available</div>
      </template>

      <template #loading>
        <div class="p-4 text-center text-gray-500">Loading data...</div>
      </template>

      <template #expansion="{ data: expandedData }">
        <div v-if="expandedData.details?.length" class="p-2 bg-gray-50">
          <DataTable
            :value="expandedData.details"
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
                <div class="truncate">
                  {{ getFieldValue(data, col.field) }}
                </div>
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
          <div class="truncate">
            {{ getFieldValue(data, col.field) }}
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
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
import type { ColumnDef } from '../../composables/columns/types'
import type { TableRowData } from '~/components/viewer/schedules/types'
import { debug, DebugCategories } from '~/components/viewer/schedules/utils/debug'

interface Props {
  modelValue: TableRowData[]
  data: TableRowData[]
  scheduleData: TableRowData[]
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
    minWidth: '100px',
    maxWidth: col.width ? `${col.width}px` : 'none',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  }
}

function getFieldValue(data: TableRowData, field: string) {
  try {
    // Handle special fields first
    if (field === 'mark' || field === 'category' || field === 'host') {
      return data[field]
    }

    // Handle parameters with dot notation (e.g., 'Identity Data.Mark')
    if (field.includes('.') && data.parameters) {
      const [group, param] = field.split('.')
      if (data.parameters[`${group}.${param}`]) {
        return data.parameters[`${group}.${param}`]
      }
    }

    // Handle direct parameter access
    if (data.parameters && field in data.parameters) {
      return data.parameters[field]
    }

    // Handle raw data access
    if (data._raw && typeof data._raw === 'object') {
      const raw = data._raw as Record<string, unknown>
      if (field in raw) {
        return raw[field]
      }
    }

    // Fallback to direct field access
    return data[field]
  } catch (error) {
    debug.error(DebugCategories.ERROR, 'Error getting field value:', {
      error,
      field,
      dataId: data.id
    })
    return undefined
  }
}

function handleExpandedRowsUpdate(value: unknown) {
  if (Array.isArray(value)) {
    emit('update:modelValue', value as TableRowData[])
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
    typeof event.order === 'number' &&
    typeof event.field === 'string'
  ) {
    emit('sort', event.field, event.order)
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
