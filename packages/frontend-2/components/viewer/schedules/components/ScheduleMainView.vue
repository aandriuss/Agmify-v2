<template>
  <div class="viewer-container">
    <!-- Debug Info -->
    <div v-if="debug.isEnabled.value" class="mb-2 p-2 bg-gray-100">
      <pre class="text-xs">{{ debugInfo }}</pre>
    </div>

    <!-- PrimeVue DataTable -->
    <DataTable
      v-model:expanded-rows="expandedRows"
      :value="tableData"
      :loading="!hasData"
      :resizable-columns="true"
      :reorderable-columns="true"
      table-style="min-width: 50rem"
      @column-reorder="handleColumnReorder"
      @row-click="handleRowClick"
    >
      <template #empty>No data available</template>
      <template #loading>Loading data...</template>

      <!-- Expander column -->
      <Column v-if="hasExpandableRows" :expander="true" style="width: 3rem">
        <template #body="{ data }">
          <div class="expander-cell">
            <button
              v-if="(data.details?.length ?? 0) > 0"
              type="button"
              class="expander-button"
              @click.stop="toggleRow(data)"
            >
              <component
                :is="expandedRows.includes(data) ? ChevronDownIcon : ChevronRightIcon"
                class="h-4 w-4"
              />
            </button>
          </div>
        </template>
      </Column>

      <Column
        v-for="col in columns"
        :key="col.id"
        :field="col.field"
        :header="col.header"
        :sortable="col.sortable"
        :style="{ width: col.width + 'px' }"
      />

      <template #expansion="slotProps">
        <div v-if="(slotProps.data.details?.length ?? 0) > 0" class="p-3">
          <DataTable
            :value="slotProps.data.details"
            class="nested-table"
            :resizable-columns="true"
            :reorderable-columns="true"
            @column-reorder="handleColumnReorder"
          >
            <Column
              v-for="col in childColumns"
              :key="col.id"
              :field="col.field"
              :header="col.header"
              :sortable="col.sortable"
              :style="{ width: col.width + 'px' }"
            />
          </DataTable>
        </div>
      </template>
    </DataTable>

    <!-- Debug Panel -->
    <DebugPanel
      v-if="debug.isEnabled.value"
      :schedule-data="store.scheduleData.value"
      :evaluated-data="store.evaluatedData.value"
      :table-data="store.tableData.value"
      :parent-elements="parentElements"
      :child-elements="childElements"
      :parent-columns="columns"
      :child-columns="childColumns"
      :show-parameter-stats="true"
      :show-bim-data="true"
      :show-parameter-categories="true"
      :show-table-categories="true"
      @update:is-test-mode="handleTestModeUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from '~/composables/core/store'
import { useTableStore } from '~/composables/core/tables/store/store'
import { useParameterStore } from '~/composables/core/parameters/store'
import type { ElementData, TableColumn } from '~/composables/core/types'
import DebugPanel from '~/components/core/debug/DebugPanel.vue'
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'

const emit = defineEmits<{
  (e: 'error', payload: { error: Error }): void
  (e: 'table-updated'): void
}>()

const debug = useDebug()
const store = useStore()
const tableStore = useTableStore()
const parameterStore = useParameterStore()

// Row expansion control
const expandedRows = ref<ElementData[]>([])

// Toggle row expansion
function toggleRow(row: ElementData): void {
  const index = expandedRows.value.indexOf(row)
  if (index !== -1) {
    expandedRows.value.splice(index, 1)
  } else {
    expandedRows.value.push(row)
  }
}

// Handle row click to prevent expansion of rows without children
function handleRowClick(event: { data: ElementData }) {
  const hasChildren = (event.data.details?.length ?? 0) > 0
  if (!hasChildren) {
    // Remove from expanded rows if it was somehow expanded
    expandedRows.value = expandedRows.value.filter((row) => row.id !== event.data.id)
  }
}

// Check if any rows are expandable
const hasExpandableRows = computed(() =>
  tableData.value.some((row) => (row.details?.length ?? 0) > 0)
)

// Column management
const currentTable = computed(() => tableStore.computed.currentTable.value)
const columns = computed(() => currentTable.value?.parentColumns || [])
const childColumns = computed(() => currentTable.value?.childColumns || [])

// Get filtered categories from store
const selectedCategories = computed(() => ({
  parent: currentTable.value?.categoryFilters.selectedParentCategories || [],
  child: currentTable.value?.categoryFilters.selectedChildCategories || []
}))

// Element filtering
const parentElements = computed<ElementData[]>(() => {
  const elements = (store.scheduleData.value || []).filter(
    (el) => el.metadata?.isParent
  )

  if (selectedCategories.value.parent.length === 0) return elements

  return elements.filter(
    (el) => el.category && selectedCategories.value.parent.includes(el.category)
  )
})

const childElements = computed<ElementData[]>(() => {
  const elements = (store.scheduleData.value || []).filter(
    (el) => !el.metadata?.isParent
  )

  if (selectedCategories.value.child.length === 0) return elements

  return elements.filter(
    (el) => el.category && selectedCategories.value.child.includes(el.category)
  )
})

// Data table structure with parent-child relationships
const tableData = computed(() => {
  // Create a map of parent marks for faster lookup
  const parentMarkMap = new Map<string, ElementData>()
  parentElements.value.forEach((parent) => {
    const markValue =
      parent.parameters?.['Mark']?.value || parent.parameters?.['mark']?.value
    if (markValue) {
      parentMarkMap.set(String(markValue), parent)
    }
  })

  // Group children by their host value
  const childrenByHost = new Map<string, ElementData[]>()
  const ungroupedChildren: ElementData[] = []

  childElements.value.forEach((child) => {
    const hostValue =
      child.parameters?.['Host']?.value || child.parameters?.['host']?.value

    if (hostValue && parentMarkMap.has(String(hostValue))) {
      const host = String(hostValue)
      const children = childrenByHost.get(host) || []
      children.push(child)
      childrenByHost.set(host, children)
    } else {
      ungroupedChildren.push(child)
    }
  })

  // Create result array with parents and their matched children
  const result = parentElements.value.map((parent) => {
    const markValue =
      parent.parameters?.['Mark']?.value || parent.parameters?.['mark']?.value
    const children = markValue ? childrenByHost.get(String(markValue)) || [] : []

    return {
      ...parent,
      details: children,
      parameters: parent.parameters || {}
    } as ElementData
  })

  // Add ungrouped section if needed
  if (ungroupedChildren.length > 0) {
    result.push({
      id: '__ungrouped',
      name: 'Ungrouped',
      type: 'ungrouped',
      field: '__ungrouped',
      header: 'Ungrouped',
      visible: true,
      order: result.length,
      removable: false,
      details: ungroupedChildren,
      parameters: {}
    } as ElementData)
  }

  return result
})

// Watch tableData to reset expanded rows when data changes
watch(tableData, () => {
  // Filter out any expanded rows that no longer have children
  expandedRows.value = expandedRows.value.filter(
    (row) => (row.details?.length ?? 0) > 0
  )
})

const debugInfo = computed(() => ({
  tableId: tableStore.computed.currentTable.value?.id,
  tableName: tableStore.computed.currentTable.value?.name,
  dataLength: tableData.value?.length || 0,
  columnsLength: columns.value?.length || 0,
  childColumnsLength: childColumns.value?.length || 0,
  selectedCategories: selectedCategories.value,
  error: error.value?.message
}))

const hasData = computed(() => {
  const storesReady =
    store.initialized.value &&
    parameterStore.state.value.initialized &&
    tableStore.computed.currentTable.value !== null

  return storesReady && (store.scheduleData.value?.length ?? 0) > 0
})

const error = computed(() => {
  if (parameterStore.state.value.processing.error) {
    return parameterStore.state.value.processing.error instanceof Error
      ? parameterStore.state.value.processing.error
      : new Error('Processing error')
  }
  return null
})

// Event handlers
// Helper function to reorder columns
function reorderColumns(
  columns: TableColumn[],
  dragIndex: number,
  dropIndex: number
): TableColumn[] {
  // Create a shallow copy of the array
  const updatedColumns = columns.slice()

  // Move the column
  const [movedColumn] = updatedColumns.splice(dragIndex, 1)
  updatedColumns.splice(dropIndex, 0, movedColumn)

  // Create new objects with updated order
  return updatedColumns.map((col, index) => ({
    ...col,
    order: index
  }))
}

async function handleColumnReorder(event: {
  dragIndex: number
  dropIndex: number
  target?: HTMLElement
}): Promise<void> {
  try {
    // Ensure store is initialized and table is loaded
    if (!store.initialized.value || !parameterStore.state.value.initialized) {
      throw new Error('Store not initialized')
    }

    if (!currentTable.value) {
      throw new Error('No table selected')
    }

    // Determine if we're reordering parent columns
    const isParent = !event.target?.closest('.nested-table')
    const sourceColumns = isParent ? columns.value : childColumns.value

    if (!sourceColumns || !sourceColumns.length) {
      throw new Error('No columns available')
    }

    // Validate indices
    if (
      event.dragIndex < 0 ||
      event.dragIndex >= sourceColumns.length ||
      event.dropIndex < 0 ||
      event.dropIndex > sourceColumns.length
    ) {
      throw new Error('Invalid column indices')
    }

    // Reorder the columns
    const reorderedColumns = reorderColumns(
      sourceColumns,
      event.dragIndex,
      event.dropIndex
    )

    // Update the store with new column order
    await tableStore.updateColumns(
      isParent ? reorderedColumns : currentTable.value.parentColumns,
      isParent ? currentTable.value.childColumns : reorderedColumns
    )

    emit('table-updated')

    debug.log(DebugCategories.TABLE_UPDATES, 'Column reordered', {
      isParent,
      dragIndex: event.dragIndex,
      dropIndex: event.dropIndex,
      columnsCount: reorderedColumns.length
    })
  } catch (err) {
    const safeError = err instanceof Error ? err : new Error('Unknown error')
    debug.error(DebugCategories.ERROR, 'Error in schedule view:', safeError)
    emit('error', { error: safeError })
  }
}

function handleTestModeUpdate(value: boolean): void {
  debug.log(DebugCategories.INITIALIZATION, 'Test mode updated:', value)
}
</script>

<style scoped>
.viewer-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

:deep(.expander-cell) {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.expander-button) {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

:deep(.expander-button:hover) {
  background-color: var(--surface-hover);
}
</style>
