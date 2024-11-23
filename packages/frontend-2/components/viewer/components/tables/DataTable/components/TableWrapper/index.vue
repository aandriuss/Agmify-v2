<template>
  <div class="datatable-wrapper">
    <DataTable
      :key="`table-${data.length}-${parentColumns.length}`"
      :value="data"
      :loading="loading"
      :sort-field="sortField"
      :sort-order="sortOrder"
      :filters="filters"
      resizable-columns
      reorderable-columns
      striped-rows
      class="p-datatable-sm"
      :paginator="false"
      :rows="10"
      expand-mode="row"
      data-key="id"
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

      <template #header>
        <slot name="header">
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
        </slot>
      </template>

      <template #expansion="{ data: expandedData }">
        <slot name="expansion" :data="expandedData">
          <div v-if="expandedData.details?.length" class="p-2 bg-gray-50">
            <DataTable
              :key="`nested-${expandedData.details.length}-${childColumns.length}`"
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

              <!-- For child columns -->
              <template v-for="group in groupedChildColumns" :key="group.source">
                <template
                  v-for="col in validColumnsInGroup(group.columns)"
                  :key="col.field"
                >
                  <Column
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
                        {{ getParameterValue(data, col.field) }}
                      </div>
                    </template>
                  </Column>
                </template>
              </template>
            </DataTable>
          </div>
        </slot>
      </template>

      <!-- For parent columns -->
      <template v-for="group in groupedParentColumns" :key="group.source">
        <template v-for="col in validColumnsInGroup(group.columns)" :key="col.field">
          <Column
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
                {{ getParameterValue(data, col.field) }}
              </div>
            </template>
          </Column>
        </template>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type {
  DataTableColumnReorderEvent,
  DataTableSortEvent,
  DataTableFilterMeta
} from 'primevue/datatable'
import type { ColumnDef } from '../../composables/columns/types'
import { debug, DebugCategories } from '~/components/viewer/schedules/utils/debug'

interface Props {
  data: unknown[]
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  loading?: boolean
  sortField?: string
  sortOrder?: number
  filters?: DataTableFilterMeta
}

interface ParameterValueState {
  currentValue: unknown
  fetchedValue: unknown
  previousValue: unknown
  userValue: unknown
}

interface SpeckleValue {
  _: unknown
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  'column-resize': [event: { element: HTMLElement }]
  'column-reorder': [event: DataTableColumnReorderEvent]
  sort: [field: string | ((item: unknown) => string), order: number]
  filter: [filters: DataTableFilterMeta]
}>()

// Event handlers
function handleColumnResize(event: { element: HTMLElement }): void {
  emit('column-resize', event)
}

function handleColumnReorder(event: DataTableColumnReorderEvent): void {
  emit('column-reorder', event)
}

function handleSort(event: DataTableSortEvent): void {
  if (event.sortField) {
    emit('sort', event.sortField, event.sortOrder || 1)
  }
}

function handleFilter(event: { filters: DataTableFilterMeta }): void {
  emit('filter', event.filters)
}

// Type guards
function isParameterValueState(value: unknown): value is ParameterValueState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'currentValue' in value &&
    'fetchedValue' in value &&
    'previousValue' in value &&
    'userValue' in value
  )
}

function isSpeckleValue(value: unknown): value is SpeckleValue {
  return typeof value === 'object' && value !== null && '_' in value
}

// Extract value from stringified JSON if needed
function extractValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }

  try {
    const parsed = JSON.parse(value)
    if (typeof parsed !== 'object' || parsed === null) {
      return value
    }

    // Check for ParameterValueState
    if (isParameterValueState(parsed)) {
      return parsed.currentValue
    }

    // Check for Speckle value
    if (isSpeckleValue(parsed)) {
      return parsed._
    }

    return value
  } catch {
    return value
  }
}

// Field value getter - handles both direct fields and parameters
function getParameterValue(data: unknown, field: string): unknown {
  if (!data || typeof data !== 'object') return null

  const obj = data as Record<string, unknown>

  // First check direct field access
  if (field in obj) {
    return extractValue(obj[field])
  }

  // Then check parameters
  if (obj.parameters && typeof obj.parameters === 'object') {
    const params = obj.parameters as Record<string, unknown>
    if (field in params) {
      const value = params[field]
      debug.log(DebugCategories.DATA, 'Parameter value found', {
        field,
        value,
        extracted: extractValue(value)
      })
      return extractValue(value)
    }
  }

  debug.log(DebugCategories.DATA, 'No parameter value found', {
    field,
    hasParameters: obj.parameters && typeof obj.parameters === 'object',
    parameters: obj.parameters
  })
  return null
}

// Helper function to get valid columns from a group
function validColumnsInGroup(columns: ColumnDef[]): ColumnDef[] {
  return columns.filter((col): col is ColumnDef & { field: string } => {
    const isValid = col.visible && typeof col.field === 'string' && col.field.length > 0
    debug.log(DebugCategories.COLUMNS, 'Column validation', {
      field: col.field,
      isValid,
      visible: col.visible,
      fieldType: typeof col.field
    })
    return isValid
  })
}

// Group columns by source - only include valid columns
const groupedParentColumns = computed(() => {
  const groups = new Map<string, ColumnDef[]>()

  // Only include columns with valid fields
  const validColumns = props.parentColumns.filter((col) => {
    const isValid = col.visible && typeof col.field === 'string' && col.field.length > 0
    debug.log(DebugCategories.COLUMNS, 'Column validation', {
      field: col.field,
      isValid,
      visible: col.visible,
      fieldType: typeof col.field
    })
    return isValid
  })

  debug.log(DebugCategories.COLUMNS, 'Valid parent columns', {
    total: props.parentColumns.length,
    valid: validColumns.length,
    columns: validColumns
  })

  validColumns.forEach((col) => {
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

const groupedChildColumns = computed(() => {
  const groups = new Map<string, ColumnDef[]>()

  // Only include columns with valid fields
  const validColumns = props.childColumns.filter((col) => {
    const isValid = col.visible && typeof col.field === 'string' && col.field.length > 0
    debug.log(DebugCategories.COLUMNS, 'Column validation', {
      field: col.field,
      isValid,
      visible: col.visible,
      fieldType: typeof col.field
    })
    return isValid
  })

  debug.log(DebugCategories.COLUMNS, 'Valid child columns', {
    total: props.childColumns.length,
    valid: validColumns.length,
    columns: validColumns
  })

  validColumns.forEach((col) => {
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

// Column styling
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

// Watch for data changes
watch(
  () => props.data,
  (newData) => {
    debug.log(DebugCategories.DATA, 'TableWrapper data updated', {
      length: newData.length,
      sample: newData[0],
      parentColumns: props.parentColumns.length,
      childColumns: props.childColumns.length
    })
  },
  { deep: true, immediate: true }
)

// Watch for column changes
watch(
  [() => props.parentColumns, () => props.childColumns],
  ([newParentCols, newChildCols]) => {
    debug.log(DebugCategories.COLUMNS, 'TableWrapper columns updated', {
      parentColumns: newParentCols.length,
      childColumns: newChildCols.length,
      parentVisible: newParentCols.filter((c) => c.visible).length,
      childVisible: newChildCols.filter((c) => c.visible).length
    })
  },
  { deep: true, immediate: true }
)

// Add onMounted hook to log initial data
onMounted(() => {
  debug.log(DebugCategories.DATA, 'Initial data', {
    data: props.data,
    parentColumns: props.parentColumns,
    childColumns: props.childColumns
  })
})
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
