<template>
  <div class="datatable-wrapper">
    <DataTable
      :key="`table-${props.data.length}-${props.parentColumns.length}`"
      :value="sortedData"
      :expanded-rows="expandedRows"
      :loading="props.loading"
      :sort-field="props.sortField"
      :sort-order="props.sortOrder"
      :filters="props.filters"
      resizable-columns
      reorderable-columns
      striped-rows
      class="p-datatable-sm"
      :paginator="false"
      :rows="10"
      expand-mode="row"
      data-key="id"
      :expandable-row-groups="false"
      :row-expandable="(row) => hasDetails(row)"
      :row-class="(row) => (!hasDetails(row) ? 'non-expandable-row' : '')"
      :pt="{
        bodyRow: {
          'data-expandable': (options) => hasDetails(options?.row)
        }
      }"
      @update:expanded-rows="handleExpandedRowsUpdate"
      @column-resize-end="handleColumnResize"
      @column-reorder="handleColumnReorder"
      @sort="handleSort"
      @filter="handleFilter"
      @row-expand="(event) => handleRowExpand(event?.data)"
      @row-collapse="(event) => handleRowCollapse(event?.data)"
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

      <template #expansion="{ data: expandedData }">
        <div v-if="expandedData.details?.length" class="p-2 bg-gray-50">
          <DataTable
            :key="`nested-${expandedData.details.length}-${props.childColumns.length}`"
            :value="expandedData.details"
            resizable-columns
            reorderable-columns
            striped-rows
            class="nested-table p-datatable-sm"
            data-key="id"
            :expandable-row-groups="false"
            :row-expandable="(row: TableRow | ElementData) => hasDetails(row)"
            @column-resize-end="handleColumnResize"
            @column-reorder="handleColumnReorder"
          >
            <Column
              v-if="hasNestedChildren(expandedData)"
              :expander="true"
              style="width: 3rem"
              :show-expander-icon="(row: TableRow | ElementData) => hasDetails(row)"
            />
            <Column
              v-for="col in validColumnsInGroup(props.childColumns)"
              :key="col.field"
              :field="col.field"
              :header="col.header"
              :data-field="col.field"
              :style="getColumnStyle(col)"
              sortable
            >
              <template #header>
                <div class="column-header">
                  <span class="header-text">{{ col.header }}</span>
                  <span class="source-tag">{{ col.source || 'Parameters' }}</span>
                </div>
              </template>
              <template #body="{ data }">
                <div class="truncate">{{ data[col.field] }}</div>
              </template>
            </Column>
          </DataTable>
        </div>
      </template>

      <Column
        v-if="hasExpandableRows"
        :expander="true"
        style="width: 3rem"
        :show-expander-icon="(row: TableRow | ElementData) => hasDetails(row)"
      />
      <Column
        v-for="col in validColumnsInGroup(props.parentColumns)"
        :key="col.field"
        :field="col.field"
        :header="col.header"
        :data-field="col.field"
        :style="getColumnStyle(col)"
        sortable
      >
        <template #header>
          <div class="column-header">
            <span class="header-text">{{ col.header }}</span>
            <span class="source-tag">{{ col.source || 'Parameters' }}</span>
          </div>
        </template>
        <template #body="{ data }">
          <div class="truncate">{{ data[col.field] }}</div>
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
  DataTableColumnReorderEvent,
  DataTableSortEvent,
  DataTableFilterMeta,
  DataTableExpandedRows
} from 'primevue/datatable'
import type { ColumnDef } from '../../composables/columns/types'
import type { TableRow, ElementData } from '~/components/viewer/schedules/types'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'

interface Props {
  data: (TableRow | ElementData)[]
  expandedRows: (TableRow | ElementData)[]
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  loading?: boolean
  sortField?: string
  sortOrder?: number
  filters?: DataTableFilterMeta
}

interface DataTableEvent {
  data: unknown
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  'update:expanded-rows': [value: (TableRow | ElementData)[]]
  'column-resize': [event: { element: HTMLElement }]
  'column-reorder': [event: DataTableColumnReorderEvent]
  'row-expand': [row: TableRow | ElementData]
  'row-collapse': [row: TableRow | ElementData]
  sort: [field: string, order: number]
  filter: [filters: DataTableFilterMeta]
}>()

// Sort data to keep "Ungrouped" at the end
const sortedData = computed(() => {
  const data = [...props.data]
  return data.sort((a, b) => {
    // Always put "Ungrouped" at the end
    if (a.category === 'Ungrouped' && b.category !== 'Ungrouped') return 1
    if (a.category !== 'Ungrouped' && b.category === 'Ungrouped') return -1

    // For other categories, maintain current sort
    if (props.sortField) {
      // Handle field access through parameters or direct properties
      const getFieldValue = (row: TableRow | ElementData, field: string): unknown => {
        // First check if it's a known property of BaseElement
        if (
          field === 'id' ||
          field === 'type' ||
          field === 'mark' ||
          field === 'category' ||
          field === '_visible'
        ) {
          return row[field]
        }

        // Then check parameters
        if (row.parameters && typeof row.parameters === 'object') {
          const params = row.parameters as Record<string, unknown>
          if (field in params) {
            return params[field]
          }
        }

        // Finally check if it's a details array
        if (field === 'details' && 'details' in row) {
          return row.details
        }

        return null
      }

      const aValue = getFieldValue(a, props.sortField)
      const bValue = getFieldValue(b, props.sortField)

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1
      if (aValue === bValue) return 0

      // Type-safe comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return (props.sortOrder || 1) * aValue.localeCompare(bValue)
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (props.sortOrder || 1) * (aValue - bValue)
      }
      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return (props.sortOrder || 1) * (aValue === bValue ? 0 : aValue ? 1 : -1)
      }
      if (Array.isArray(aValue) && Array.isArray(bValue)) {
        return (props.sortOrder || 1) * (aValue.length - bValue.length)
      }

      // For other types, convert to string and compare
      const aStr = String(aValue)
      const bStr = String(bValue)

      // Try to compare as numbers first
      const aNum = Number(aStr)
      const bNum = Number(bStr)
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return (props.sortOrder || 1) * (aNum - bNum)
      }

      // Fall back to string comparison
      return (props.sortOrder || 1) * aStr.localeCompare(bStr)
    }
    return 0
  })
})

// Check if any rows are expandable
const hasExpandableRows = computed(() => {
  return props.data.some((row) => hasDetails(row))
})

// Helper function to check if row has details
function hasDetails(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  const row = data as TableRow | ElementData
  return 'details' in row && Array.isArray(row.details) && row.details.length > 0
}

// Helper function to check if any children have nested children
function hasNestedChildren(data: TableRow | ElementData): boolean {
  return (
    data.details?.some(
      (child) =>
        'details' in child && Array.isArray(child.details) && child.details.length > 0
    ) || false
  )
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

// Event handlers
function handleExpandedRowsUpdate(value: DataTableExpandedRows | unknown[]): void {
  if (Array.isArray(value)) {
    // Only allow expansion of rows with details
    const validExpansions = value.filter((row) => hasDetails(row))
    debug.log(DebugCategories.DATA_TRANSFORM, 'Expanded rows updated', {
      rowCount: validExpansions.length,
      rows: validExpansions.map((row) => ({
        id: (row as TableRow).id,
        hasDetails: !!(row as TableRow).details?.length
      }))
    })
    emit('update:expanded-rows', validExpansions as (TableRow | ElementData)[])
  }
}

function handleRowExpand(row: TableRow | ElementData): void {
  if (!hasDetails(row)) return
  debug.log(DebugCategories.DATA_TRANSFORM, 'Row expanded', {
    id: row.id,
    type: row.type,
    hasDetails: 'details' in row && Array.isArray(row.details)
  })
  emit('row-expand', row)
}

function handleRowCollapse(row: TableRow | ElementData): void {
  if (!hasDetails(row)) return
  debug.log(DebugCategories.DATA_TRANSFORM, 'Row collapsed', {
    id: row.id,
    type: row.type,
    hasDetails: 'details' in row && Array.isArray(row.details)
  })
  emit('row-collapse', row)
}

function handleColumnResize(event: { element: HTMLElement }): void {
  emit('column-resize', event)
}

function handleColumnReorder(event: DataTableColumnReorderEvent): void {
  emit('column-reorder', event)
}

function handleSort(event: DataTableSortEvent): void {
  if (event.sortField) {
    emit('sort', event.sortField as string, event.sortOrder || 1)
  }
}

function handleFilter(event: { filters: DataTableFilterMeta }): void {
  emit('filter', event.filters)
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

/* Completely hide expander column by default */
:deep(.p-datatable-tbody > tr > td.p-column-expander) {
  width: 0;
  padding: 0;
  border: none;
  visibility: hidden;
  display: none;
  pointer-events: none;
}

:deep(.p-datatable-tbody > tr > td.p-column-expander .p-row-toggler) {
  display: none;
  visibility: hidden;
  pointer-events: none;
}

/* Only show expander for rows that actually have children */
:deep(.p-datatable-tbody > tr[data-p-expandable='true'] > td.p-column-expander) {
  width: 3rem;
  padding: 0.5rem;
  border-bottom: 1px solid #e9ecef;
  visibility: visible;
  display: table-cell;
  pointer-events: auto;
}

:deep(
    .p-datatable-tbody
      > tr[data-p-expandable='true']
      > td.p-column-expander
      .p-row-toggler
  ) {
  display: inline-flex;
  visibility: visible;
  pointer-events: auto;
}

/* Prevent any expansion behavior on non-expandable rows */
:deep(.p-datatable-tbody > tr:not([data-p-expandable='true'])) {
  pointer-events: none;
}

:deep(.p-datatable-tbody > tr:not([data-p-expandable='true']) > td) {
  pointer-events: auto;
}

:deep(.p-datatable-tbody > tr:not([data-p-expandable='true']) > td.p-column-expander) {
  display: none;
  pointer-events: none;
}

/* Remove hover effect on non-expandable rows */
:deep(.p-datatable-tbody > tr:not([data-p-expandable='true']):hover) {
  cursor: default;
}

/* Ensure expansion panel is properly hidden */
:deep(.p-datatable-tbody > tr:not([data-p-expandable='true']) .p-row-toggler) {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

/* Enhanced styles for non-expandable rows */
:deep(.non-expandable-row) {
  pointer-events: none !important;
}

:deep(.non-expandable-row > td) {
  pointer-events: auto !important;
}

:deep(.non-expandable-row > td.p-column-expander) {
  display: none !important;
  width: 0 !important;
  padding: 0 !important;
  border: none !important;
  pointer-events: none !important;
}

:deep(.non-expandable-row .p-row-toggler) {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
  width: 0 !important;
  padding: 0 !important;
}

:deep(.non-expandable-row:hover) {
  cursor: default !important;
}

/* Prevent any expansion behavior */
:deep(.p-datatable-tbody > tr[data-expandable='false']) {
  pointer-events: none !important;
}

:deep(.p-datatable-tbody > tr[data-expandable='false'] > td) {
  pointer-events: auto !important;
}

:deep(.p-datatable-tbody > tr[data-expandable='false'] > td.p-column-expander) {
  display: none !important;
  width: 0 !important;
  padding: 0 !important;
  border: none !important;
  pointer-events: none !important;
}

:deep(.p-datatable-tbody > tr[data-expandable='false'] .p-row-toggler) {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
  width: 0 !important;
  padding: 0 !important;
}

/* Only show expander for rows that actually have children */
:deep(.p-datatable-tbody > tr[data-expandable='true'] > td.p-column-expander) {
  width: 3rem;
  padding: 0.5rem;
  border-bottom: 1px solid #e9ecef;
  visibility: visible;
  display: table-cell;
  pointer-events: auto;
}

:deep(
    .p-datatable-tbody
      > tr[data-expandable='true']
      > td.p-column-expander
      .p-row-toggler
  ) {
  display: inline-flex;
  visibility: visible;
  pointer-events: auto;
}
</style>
