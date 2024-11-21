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

      <template #header>
        <div class="parameter-groups">
          <div
            v-for="group in groupedParentColumns"
            :key="group.source"
            class="group-info"
          >
            <span class="group-name">{{ group.source }}</span>
            <span class="group-count">
              {{ group.visibleCount }}/{{ group.columns.length }}
            </span>
          </div>
        </div>
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
            <template #header>
              <div class="parameter-groups">
                <div
                  v-for="group in groupedChildColumns"
                  :key="group.source"
                  class="group-info"
                >
                  <span class="group-name">{{ group.source }}</span>
                  <span class="group-count">
                    {{ group.visibleCount }}/{{ group.columns.length }}
                  </span>
                </div>
              </div>
            </template>

            <Column :expander="true" style="width: 3rem" />
            <template v-for="group in groupedChildColumns" :key="group.source">
              <Column
                v-for="col in group.columns"
                :key="col.field"
                :field="col.field"
                :header="col.header"
                :data-field="col.field"
                :data-source="group.source"
                :style="getColumnStyle(col)"
                sortable
              >
                <template #header>
                  <div class="column-header">
                    <span class="header-text">{{ col.header }}</span>
                    <span class="source-tag">{{ group.source }}</span>
                  </div>
                </template>
                <template #body="{ data }">
                  <div class="truncate">
                    {{ getFieldValue(data, col.field) }}
                  </div>
                </template>
              </Column>
            </template>
          </DataTable>
        </div>
      </template>

      <Column :expander="true" style="width: 3rem" />
      <template v-for="group in groupedParentColumns" :key="group.source">
        <Column
          v-for="col in group.columns"
          :key="col.field"
          :field="col.field"
          :header="col.header"
          :header-component="col.headerComponent"
          :data-field="col.field"
          :data-source="group.source"
          :style="getColumnStyle(col)"
          sortable
        >
          <template #header>
            <div class="column-header">
              <span class="header-text">{{ col.header }}</span>
              <span class="source-tag">{{ group.source }}</span>
            </div>
          </template>
          <template #body="{ data }">
            <div class="truncate">
              {{ getFieldValue(data, col.field) }}
            </div>
          </template>
        </Column>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type {
  DataTableSortEvent,
  DataTableFilterEvent,
  DataTableFilterMeta
} from 'primevue/datatable'
import type { ColumnDef } from '../../composables/columns/types'
import type { TableRow, ParameterValueState } from '~/components/viewer/schedules/types'
import { debug, DebugCategories } from '~/components/viewer/schedules/utils/debug'
import { isTableRow } from '../../composables/useTableUtils'

// Type guard for ParameterValueState
function isParameterValueState(value: unknown): value is ParameterValueState {
  if (!value || typeof value !== 'object') return false
  const state = value as Record<string, unknown>
  return (
    'fetchedValue' in state &&
    'currentValue' in state &&
    'previousValue' in state &&
    'userValue' in state
  )
}

interface Props {
  modelValue: TableRow[]
  data: TableRow[]
  scheduleData: TableRow[]
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
  'update:modelValue': [value: TableRow[]]
  'column-resize': [event: { element: HTMLElement }]
  'column-reorder': [event: { target: HTMLElement | null }]
  sort: [field: string, order: number]
  filter: [filters: Record<string, unknown>]
}>()

interface ColumnGroup {
  source: string
  columns: ColumnDef[]
  visibleCount: number
}

const groupedParentColumns = computed<ColumnGroup[]>(() => {
  const groups = new Map<string, ColumnDef[]>()

  props.parentColumns
    .filter((col) => col.visible)
    .forEach((col) => {
      const source = col.source || 'Parameters'
      if (!groups.has(source)) {
        groups.set(source, [])
      }
      groups.get(source)!.push(col)
    })

  return Array.from(groups.entries()).map(([source, columns]) => ({
    source,
    columns: columns.sort((a, b) => (a.order || 0) - (b.order || 0)),
    visibleCount: columns.length
  }))
})

const groupedChildColumns = computed<ColumnGroup[]>(() => {
  const groups = new Map<string, ColumnDef[]>()

  props.childColumns
    .filter((col) => col.visible)
    .forEach((col) => {
      const source = col.source || 'Parameters'
      if (!groups.has(source)) {
        groups.set(source, [])
      }
      groups.get(source)!.push(col)
    })

  return Array.from(groups.entries()).map(([source, columns]) => ({
    source,
    columns: columns.sort((a, b) => (a.order || 0) - (b.order || 0)),
    visibleCount: columns.length
  }))
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

function getFieldValue(data: TableRow, field: string): unknown {
  try {
    if (!isTableRow(data)) {
      debug.error(DebugCategories.ERROR, 'Invalid table row data:', { data })
      return undefined
    }

    // Handle special fields first
    if (field === 'mark' || field === 'category' || field === 'host') {
      return data[field as keyof TableRow]
    }

    // Handle parameters
    if (data.parameters) {
      // Handle parameters with dot notation (e.g., 'Identity Data.Mark')
      if (field.includes('.')) {
        const [group, param] = field.split('.')
        const paramKey = `${group}.${param}`
        const paramValue = data.parameters[paramKey]

        if (isParameterValueState(paramValue)) {
          return (
            paramValue.userValue ?? paramValue.currentValue ?? paramValue.fetchedValue
          )
        }
        return paramValue
      }

      // Handle direct parameter access
      if (field in data.parameters) {
        const paramValue = data.parameters[field]
        if (isParameterValueState(paramValue)) {
          return (
            paramValue.userValue ?? paramValue.currentValue ?? paramValue.fetchedValue
          )
        }
        return paramValue
      }
    }

    // Handle raw data access
    if ('_raw' in data && data._raw && typeof data._raw === 'object') {
      const raw = data._raw as Record<string, unknown>
      if (field in raw) {
        return raw[field]
      }
    }

    // Fallback to direct field access
    return (data as Record<string, unknown>)[field]
  } catch (error) {
    debug.error(DebugCategories.ERROR, 'Error getting field value:', {
      error,
      field,
      dataId: isTableRow(data) ? data.id : 'unknown',
      parameters:
        isTableRow(data) && data.parameters ? Object.keys(data.parameters) : [],
      raw: isTableRow(data) && '_raw' in data ? Object.keys(data._raw as object) : []
    })
    return undefined
  }
}

function handleExpandedRowsUpdate(value: unknown) {
  if (Array.isArray(value) && value.every(isTableRow)) {
    emit('update:modelValue', value)
  }
}

function handleColumnResize(event: { element: HTMLElement }) {
  emit('column-resize', { element: event.element })
}

function handleColumnReorder(event: { target: HTMLElement | null }) {
  emit('column-reorder', { target: event.target })
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

.parameter-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.group-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  background-color: white;
  border-radius: 0.25rem;
  border: 1px solid #e9ecef;
}

.group-name {
  font-weight: 500;
  color: #495057;
}

.group-count {
  font-size: 0.75rem;
  color: #6c757d;
  background-color: #f1f3f5;
  padding: 0.125rem 0.375rem;
  border-radius: 1rem;
}

.column-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.header-text {
  font-weight: 600;
  color: #495057;
}

.source-tag {
  font-size: 0.75rem;
  color: #6c757d;
  background-color: #f1f3f5;
  padding: 0.125rem 0.375rem;
  border-radius: 1rem;
  max-width: fit-content;
}

:deep(.p-datatable) {
  font-family: inherit;
  font-size: 0.875rem;
  line-height: 1.25rem;
}

:deep(.p-datatable-header) {
  background-color: #f8f9fa;
  padding: 0;
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
