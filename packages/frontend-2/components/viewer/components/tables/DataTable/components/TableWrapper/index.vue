<template>
  <div class="datatable-wrapper">
    <DataTable
      :key="`table-${data.length}-${parentColumns.length}`"
      :value="data"
      :expanded-rows="expandedRows"
      :schedule-data="scheduleData"
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
      expandable
      @update:expanded-rows="handleExpandedRowsUpdate"
      @column-resize-end="handleColumnResize"
      @column-reorder="handleColumnReorder"
      @sort="handleSort"
      @filter="handleFilter"
      @row-expand="(event) => handleRowExpand(event.data)"
      @row-collapse="(event) => handleRowCollapse(event.data)"
      @error="$emit('error', $event)"
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
              :expanded-rows="childExpandedRows"
              resizable-columns
              reorderable-columns
              striped-rows
              class="nested-table p-datatable-sm"
              data-key="id"
              expand-mode="row"
              expandable
              @update:expanded-rows="handleExpandedRowsUpdate"
              @column-resize-end="handleColumnResize"
              @column-reorder="handleColumnReorder"
              @row-expand="(event) => handleRowExpand(event.data)"
              @row-collapse="(event) => handleRowCollapse(event.data)"
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
                    :expander="col.expander"
                    sortable
                  >
                    <template #header>
                      <div class="column-header">
                        <span class="header-text">{{ col.header }}</span>
                        <span class="source-tag">{{ group.source }}</span>
                      </div>
                    </template>
                    <template #body="{ data }">
                      <div class="truncate" :class="{ 'has-expander': col.expander }">
                        <div
                          v-if="col.expander && hasDetails(data)"
                          class="expander-cell"
                        >
                          <button
                            class="p-row-toggler"
                            :class="{ 'p-row-expanded': isRowExpanded(data) }"
                            :data-pr-expandable="true"
                            :aria-expanded="isRowExpanded(data)"
                            :aria-label="
                              isRowExpanded(data) ? 'Collapse row' : 'Expand row'
                            "
                            @click.prevent="toggleRow(data)"
                            @keydown.enter="toggleRow(data)"
                            @keydown.space.prevent="toggleRow(data)"
                          >
                            <i class="pi pi-chevron-right" aria-hidden="true" />
                            <span>{{ getParameterValue(data, col.field) }}</span>
                          </button>
                        </div>
                        <span v-else>{{ getParameterValue(data, col.field) }}</span>
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
            :expander="col.expander"
          >
            <template #header>
              <div class="column-header">
                <span class="header-text">{{ col.header }}</span>
                <span class="source-tag">{{ group.source }}</span>
              </div>
            </template>
            <template #body="{ data }">
              <div class="truncate" :class="{ 'has-expander': col.expander }">
                <div v-if="col.expander && hasDetails(data)" class="expander-cell">
                  <button
                    class="p-row-toggler"
                    :class="{ 'p-row-expanded': isRowExpanded(data) }"
                    :data-pr-expandable="true"
                    :aria-expanded="isRowExpanded(data)"
                    :aria-label="isRowExpanded(data) ? 'Collapse row' : 'Expand row'"
                    @click.prevent="toggleRow(data)"
                    @keydown.enter="toggleRow(data)"
                    @keydown.space.prevent="toggleRow(data)"
                  >
                    <i class="pi pi-chevron-right" aria-hidden="true" />
                    <span>{{ getParameterValue(data, col.field) }}</span>
                  </button>
                </div>
                <span v-else>{{ getParameterValue(data, col.field) }}</span>
              </div>
            </template>
          </Column>
        </template>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type {
  DataTableColumnReorderEvent,
  DataTableSortEvent,
  DataTableFilterMeta,
  DataTableExpandedRows
} from 'primevue/datatable'
import type { ColumnDef } from '../../composables/columns/types'
import type {
  TableRow,
  ElementData,
  BaseElement
} from '~/components/viewer/schedules/types'
import { useDebug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'

interface Props {
  data: unknown[]
  expandedRows?: unknown[]
  scheduleData?: unknown[]
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  loading?: boolean
  sortField?: string
  sortOrder?: number
  filters?: DataTableFilterMeta
}

interface DataWithParameters {
  parameters?: Record<string, unknown>
  [key: string]: unknown
}

interface ColumnGroup {
  source: string
  columns: ColumnDef[]
  visibleCount: number
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  expandedRows: () => [],
  scheduleData: () => []
})

const expandedRowsModel = computed({
  get: () => props.expandedRows || [],
  set: (value) => {
    if (Array.isArray(value)) {
      debug.log(DebugCategories.DATA_TRANSFORM, 'Expanded rows updated', {
        rowCount: value.length,
        rows: value.map((row) => ({
          id: (row as TableRow)?.id,
          hasDetails: !!(row as TableRow)?.details?.length
        }))
      })
      emit('update:expandedRows', value)
    }
  }
})

const emit = defineEmits<{
  'update:expandedRows': [value: unknown[]]
  'column-resize': [event: { element: HTMLElement }]
  'column-reorder': [event: DataTableColumnReorderEvent]
  sort: [field: string | ((item: unknown) => string), order: number]
  filter: [filters: DataTableFilterMeta]
  'row-expand': [row: TableRow | ElementData]
  'row-collapse': [row: TableRow | ElementData]
  'table-updated': []
  'column-visibility-change': []
  error: [error: Error | unknown]
}>()

// Initialize debug
const debug = useDebug()

// Type guards
function isDataWithParameters(value: unknown): value is DataWithParameters {
  return typeof value === 'object' && value !== null
}

interface BaseElementShape {
  id: string
  type: string
  mark: string
  category: string
  _visible: boolean
  parameters: Record<string, unknown>
}

function hasRequiredBaseElementProperties(value: unknown): value is BaseElementShape {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.mark === 'string' &&
    typeof candidate.category === 'string' &&
    typeof candidate._visible === 'boolean' &&
    typeof candidate.parameters === 'object' &&
    candidate.parameters !== null
  )
}

function isBaseElement(value: unknown): value is BaseElement {
  return hasRequiredBaseElementProperties(value)
}

function isTableRowOrElementData(value: unknown): value is TableRow | ElementData {
  if (!isBaseElement(value)) return false

  // Then check details property
  if ('details' in value) {
    return Array.isArray((value as { details?: unknown }).details)
  }

  // If it's a TableRow, details is optional
  return true
}

// Helper function to check if row has details
function hasDetails(data: unknown): boolean {
  if (!isTableRowOrElementData(data)) {
    debug.log(DebugCategories.TABLE_DATA, 'Invalid data type for details check', {
      data,
      type: typeof data
    })
    return false
  }

  const hasDetailsArray = Array.isArray((data as TableRow | ElementData).details)
  const detailsLength = hasDetailsArray
    ? (data as TableRow | ElementData).details!.length
    : 0

  debug.log(DebugCategories.TABLE_DATA, 'Details check', {
    id: (data as TableRow | ElementData).id,
    mark: (data as TableRow | ElementData).mark,
    hasDetailsArray,
    detailsLength,
    details: (data as TableRow | ElementData).details
  })

  return hasDetailsArray && detailsLength > 0
}

// Helper function to check if row is expanded
function isRowExpanded(data: unknown): boolean {
  if (!isTableRowOrElementData(data)) {
    debug.log(DebugCategories.TABLE_DATA, 'Invalid data type for expansion check', {
      data,
      type: typeof data
    })
    return false
  }

  const isExpanded =
    Array.isArray(props.expandedRows) &&
    props.expandedRows.some((row) => isTableRowOrElementData(row) && row.id === data.id)

  debug.log(DebugCategories.TABLE_DATA, 'Expansion check', {
    id: (data as TableRow | ElementData).id,
    mark: (data as TableRow | ElementData).mark,
    isExpanded,
    expandedRows: props.expandedRows
  })

  return isExpanded
}

// Helper function to toggle row expansion
function toggleRow(data: unknown): void {
  if (!isTableRowOrElementData(data)) {
    debug.log(DebugCategories.TABLE_DATA, 'Invalid data type for toggle', {
      data,
      type: typeof data
    })
    return
  }

  const currentExpanded = Array.isArray(expandedRowsModel.value)
    ? [...expandedRowsModel.value]
    : []
  const index = currentExpanded.findIndex(
    (row) => isTableRowOrElementData(row) && row.id === data.id
  )

  debug.log(DebugCategories.TABLE_DATA, 'Toggle row', {
    id: data.id,
    mark: data.mark,
    wasExpanded: index !== -1,
    hasDetails: hasDetails(data),
    details: data.details
  })

  if (index === -1) {
    currentExpanded.push(data)
    handleRowExpand(data)
  } else {
    currentExpanded.splice(index, 1)
    handleRowCollapse(data)
  }

  expandedRowsModel.value = currentExpanded
}

// Event handlers
// Separate expanded state for child rows
const childExpandedRows = ref<(TableRow | ElementData)[]>([])

function handleExpandedRowsUpdate(value: DataTableExpandedRows | unknown[]): void {
  // Ensure value is an array and contains valid rows
  if (!Array.isArray(value)) {
    debug.warn(DebugCategories.TABLE_DATA, 'Invalid expanded rows value', {
      value,
      type: typeof value
    })
    return
  }

  // Filter and type check the rows
  const validRows = value.filter((row): row is TableRow | ElementData => {
    const isValid = isTableRowOrElementData(row)
    if (!isValid) {
      debug.warn(DebugCategories.TABLE_DATA, 'Invalid row in expanded rows', {
        row,
        type: typeof row
      })
    }
    return isValid
  })

  // Check if any of the valid rows are child rows
  const hasChildRows = validRows.some((row) => row.isChild)

  if (hasChildRows) {
    debug.log(DebugCategories.DATA_TRANSFORM, 'Child expanded rows updated', {
      rowCount: validRows.length,
      rows: validRows.map((row) => ({
        id: row.id,
        mark: row.mark,
        hasDetails: hasDetails(row),
        isChild: row.isChild
      }))
    })
    childExpandedRows.value = validRows
  } else {
    debug.log(DebugCategories.DATA_TRANSFORM, 'Parent expanded rows updated', {
      rowCount: validRows.length,
      rows: validRows.map((row) => ({
        id: row.id,
        mark: row.mark,
        hasDetails: hasDetails(row),
        isChild: row.isChild
      }))
    })
    emit('update:expandedRows', validRows)
  }
}

function handleRowExpand(data: unknown): void {
  if (isTableRowOrElementData(data)) {
    debug.log(DebugCategories.DATA_TRANSFORM, 'Row expanded', {
      id: data.id,
      type: data.type,
      hasDetails: hasDetails(data)
    })
    emit('row-expand', data)
  }
}

function handleRowCollapse(data: unknown): void {
  if (isTableRowOrElementData(data)) {
    debug.log(DebugCategories.DATA_TRANSFORM, 'Row collapsed', {
      id: data.id,
      type: data.type,
      hasDetails: hasDetails(data)
    })
    emit('row-collapse', data)
  }
}

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

// Type guard for unknown parsed JSON
function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Extract value from stringified JSON if needed
function extractValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }

  try {
    const parsed = JSON.parse(value) as unknown
    if (!isJsonObject(parsed)) {
      return value
    }

    // Check for parameter value state
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'currentValue' in parsed &&
      'fetchedValue' in parsed &&
      'previousValue' in parsed &&
      'userValue' in parsed
    ) {
      return (parsed as { currentValue: unknown }).currentValue
    }

    // Check for Speckle value
    if (typeof parsed === 'object' && parsed !== null && '_' in parsed) {
      return (parsed as { _: unknown })._
    }

    return value
  } catch {
    return value
  }
}

// Field value getter - handles both direct fields and parameters
function getParameterValue(data: unknown, field: string): unknown {
  if (!isDataWithParameters(data)) return null

  // First check direct field access
  if (field in data) {
    return extractValue(data[field])
  }

  // Then check parameters
  if (data.parameters && typeof data.parameters === 'object') {
    const params = data.parameters
    if (field in params) {
      const value = params[field]
      debug.log(DebugCategories.PARAMETERS, 'Parameter value found', {
        field,
        value,
        extracted: extractValue(value)
      })
      return extractValue(value)
    }
  }

  debug.log(DebugCategories.PARAMETERS, 'No parameter value found', {
    field,
    hasParameters: data.parameters && typeof data.parameters === 'object',
    parameters: data.parameters
  })
  return null
}

// Helper function to get valid columns from a group
function validColumnsInGroup(columns: ColumnDef[]): ColumnDef[] {
  return columns.filter((col): col is ColumnDef & { field: string } => {
    const isValid = col.visible && typeof col.field === 'string' && col.field.length > 0
    debug.log(DebugCategories.COLUMN_VALIDATION, 'Column validation', {
      field: col.field,
      isValid,
      visible: col.visible,
      fieldType: typeof col.field
    })
    return isValid
  })
}

// Group columns by source - only include valid columns
const groupedParentColumns = computed<ColumnGroup[]>(() => {
  const groups = new Map<string, ColumnDef[]>()

  // Only include columns with valid fields
  const validColumns = props.parentColumns.filter((col) => {
    const isValid = col.visible && typeof col.field === 'string' && col.field.length > 0
    debug.log(DebugCategories.COLUMN_VALIDATION, 'Column validation', {
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

const groupedChildColumns = computed<ColumnGroup[]>(() => {
  const groups = new Map<string, ColumnDef[]>()

  // Only include columns with valid fields
  const validColumns = props.childColumns.filter((col) => {
    const isValid = col.visible && typeof col.field === 'string' && col.field.length > 0
    debug.log(DebugCategories.COLUMN_VALIDATION, 'Column validation', {
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

// Export the component
defineExpose({
  getColumnStyle,
  validColumnsInGroup,
  groupedParentColumns,
  groupedChildColumns
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

.has-expander {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

:deep(.p-datatable-tbody > tr > td.p-column-expander) {
  width: 3rem;
  text-align: center;
}

:deep(.p-row-toggler) {
  width: 2rem;
  height: 2rem;
  color: var(--text-color);
  border: 0 none;
  background: transparent;
  border-radius: 50%;
  transition: background-color 0.2s, color 0.2s, box-shadow 0.2s;
  margin-right: 0.5rem;
  cursor: pointer;
}

:deep(.p-row-toggler:hover) {
  color: var(--text-color);
  border-color: transparent;
  background: var(--surface-hover);
}

:deep(.p-row-toggler:focus) {
  outline: 0 none;
  outline-offset: 0;
  box-shadow: 0 0 0 0.2rem var(--focus-ring);
}

:deep(.p-row-toggler.p-row-toggler-expanded) {
  transform: rotate(90deg);
}

:deep(.p-datatable-tbody > tr > td.p-column-expander .p-row-toggler) {
  visibility: hidden;
}

:deep(
    .p-datatable-tbody
      > tr
      > td.p-column-expander
      .p-row-toggler[data-pr-expandable='true']
  ) {
  visibility: visible;
}

.expander-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.p-row-toggler {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: var(--text-color);
  border: 0 none;
  background: transparent;
  border-radius: 50%;
  transition: background-color 0.2s, color 0.2s, box-shadow 0.2s;
  cursor: pointer;
  padding: 0;
  margin: 0;
}

.p-row-toggler:hover {
  color: var(--text-color);
  border-color: transparent;
  background: var(--surface-hover);
}

.p-row-toggler:focus {
  outline: 0 none;
  outline-offset: 0;
  box-shadow: 0 0 0 0.2rem var(--focus-ring);
}

.p-row-expanded .pi-chevron-right {
  transform: rotate(90deg);
}

.pi {
  font-family: PrimeIcons, sans-serif;
  font-style: normal;
}

.pi-chevron-right::before {
  content: '\e900';
}
</style>
