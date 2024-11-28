<template>
  <div class="p-4">
    <h2 class="text-lg font-semibold mb-4">Test DataTable</h2>

    <!-- Debug Info -->
    <div class="mb-4 p-4 bg-gray-100 rounded">
      <h3 class="font-medium mb-2">Data Summary:</h3>
      <div class="text-sm space-y-1">
        <div>Total Rows: {{ dummyTableRows.length }}</div>
        <div>Parent Elements: {{ parentElements.length }}</div>
        <div>Child Elements: {{ childElements.length }}</div>
        <div>Total Columns: {{ dummyColumns.length }}</div>
      </div>

      <!-- Categories Summary -->
      <div class="mt-4">
        <h4 class="font-medium mb-1">Categories:</h4>
        <div class="text-sm space-y-1">
          <div v-for="category in categories" :key="category.name">
            {{ category.name }}: {{ category.count }} elements
          </div>
        </div>
      </div>

      <!-- Host Relationships -->
      <div class="mt-4">
        <h4 class="font-medium mb-1">Host Relationships:</h4>
        <div class="text-sm space-y-1">
          <div v-for="host in hostRelationships" :key="host.mark">
            {{ host.mark }}: {{ host.children }} child elements
          </div>
        </div>
      </div>
    </div>

    <!-- Main Table -->
    <DataTable
      table-id="test-table"
      table-name="Test Schedule"
      :data="dummyTableRows"
      :value="dummyTableRows"
      :schedule-data="dummyTableRows"
      :columns="dummyColumns"
      :detail-columns="dummyColumns"
      :available-parent-parameters="availableParameters"
      :available-child-parameters="availableParameters"
      :loading="false"
      :initial-state="{
        columns: dummyColumns,
        detailColumns: dummyColumns,
        expandedRows: [],
        sortField: 'mark',
        sortOrder: 1,
        filters: {}
      }"
      @update:both-columns="handleColumnsUpdate"
      @table-updated="handleTableUpdate"
      @column-visibility-change="handleColumnVisibilityChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DataTable from '../../../components/tables/DataTable/index.vue'
import { dummyTableRows, dummyColumns } from '../../mock/dummyData'
import type { ColumnDef } from '../../../components/tables/DataTable/composables/columns/types'
import { debug, DebugCategories } from '../../debug/useDebug'

// Import CustomParameter type
import type { CustomParameter } from '../../types/'

// Computed properties for data analysis
const parentElements = computed(() => dummyTableRows.filter((row) => !row.isChild))

const childElements = computed(() => dummyTableRows.filter((row) => row.isChild))

// Category summary
const categories = computed(() => {
  const categoryMap = new Map<string, number>()
  dummyTableRows.forEach((row) => {
    const count = categoryMap.get(row.category) || 0
    categoryMap.set(row.category, count + 1)
  })
  return Array.from(categoryMap.entries()).map(([name, count]) => ({ name, count }))
})

// Host relationships
const hostRelationships = computed(() => {
  const hostMap = new Map<string, number>()
  parentElements.value.forEach((parent) => {
    const childCount = childElements.value.filter(
      (child) => child.host === parent.mark
    ).length
    if (childCount > 0) {
      hostMap.set(parent.mark, childCount)
    }
  })
  return Array.from(hostMap.entries()).map(([mark, children]) => ({ mark, children }))
})

// Convert parameters to available parameters format
const availableParameters = computed<CustomParameter[]>(() => {
  const uniqueParams = new Set<string>()

  dummyTableRows.forEach((row) => {
    Object.keys(row.parameters).forEach((key) => {
      uniqueParams.add(key)
    })
  })

  return Array.from(uniqueParams).map((param) => ({
    id: param,
    field: param,
    name: param.charAt(0).toUpperCase() + param.slice(1),
    header: param.charAt(0).toUpperCase() + param.slice(1),
    type: 'fixed' as const,
    source: 'Parameters'
  }))
})

// Event handlers
function handleColumnsUpdate(updates: {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
}) {
  debug.log(DebugCategories.COLUMNS, 'Columns updated:', {
    parentColumns: updates.parentColumns.length,
    childColumns: updates.childColumns.length
  })
}

function handleTableUpdate(payload: { tableId: string; tableName: string }) {
  debug.log(DebugCategories.TABLE_UPDATES, 'Table updated:', payload)
}

function handleColumnVisibilityChange(column: ColumnDef) {
  debug.log(DebugCategories.COLUMNS, 'Column visibility changed:', {
    field: column.field,
    visible: column.visible
  })
}
</script>

<style scoped>
.space-y-1 > * + * {
  margin-top: 0.25rem;
}
</style>
