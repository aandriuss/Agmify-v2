<template>
  <div>
    <!-- Debug Panel -->
    <div class="p-4 bg-gray-100 border-b">
      <div class="flex justify-between items-center mb-2">
        <h3 class="font-medium">Debug Panel</h3>
        <button
          class="px-2 py-1 text-sm bg-blue-500 text-white rounded"
          @click="showRawData = !showRawData"
        >
          {{ showRawData ? 'Hide' : 'Show' }} Raw Data
        </button>
      </div>
      <div v-if="showRawData" class="space-y-4">
        <div class="space-y-2">
          <h4 class="font-medium">Data Stats:</h4>
          <ul class="text-sm space-y-1">
            <li>Schedule Data Count: {{ scheduleData.length }}</li>
            <li>Table Data Count: {{ tableData.length }}</li>
            <li>Parent Categories: {{ getUniqueCategories(scheduleData) }}</li>
            <li>
              Child Categories:
              {{ getUniqueChildCategories(scheduleData) }}
            </li>
          </ul>
        </div>
        <div class="space-y-2">
          <h4 class="font-medium">First Item Sample:</h4>
          <pre class="text-xs bg-white p-2 rounded overflow-auto max-h-60">{{
            JSON.stringify(scheduleData[0], null, 2)
          }}</pre>
        </div>
        <div class="space-y-2">
          <h4 class="font-medium">Raw BIM Data:</h4>
          <pre class="text-xs bg-white p-2 rounded overflow-auto max-h-60">{{
            JSON.stringify(scheduleData, null, 2)
          }}</pre>
        </div>
        <div class="space-y-2">
          <h4 class="font-medium">State:</h4>
          <pre class="text-xs bg-white p-2 rounded overflow-auto max-h-60">{{
            debugState
          }}</pre>
        </div>
      </div>
    </div>

    <!-- Data Table -->
    <DataTable
      v-if="canShowTable"
      :key="`${tableKey}-${scheduleData.length}`"
      :table-id="currentTableId"
      :table-name="tableName"
      :data="tableData"
      :columns="mergedTableColumns"
      :detail-columns="mergedDetailColumns"
      :available-parent-parameters="mergedParentParameters"
      :available-child-parameters="mergedChildParameters"
      :loading="isLoadingAdditionalData"
      @update:both-columns="handleBothColumnsUpdate"
      @table-updated="handleTableUpdate"
      @column-visibility-change="handleColumnVisibilityChange"
    />
    <div v-else-if="loadingError" class="p-4 text-center text-red-500">
      <div class="flex flex-col items-center gap-2">
        <span class="font-medium">{{ loadingError.message }}</span>
        <span class="text-xs text-gray-400 mt-2 whitespace-pre-wrap">
          {{ debugState }}
        </span>
      </div>
    </div>
    <div v-else-if="isLoading" class="p-4 text-center text-gray-500">
      <div class="flex flex-col items-center gap-2">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span class="font-medium">{{ loadingMessage }}</span>
        <span v-if="loadingDetail" class="text-sm text-gray-400">
          {{ loadingDetail }}
        </span>
        <span class="text-xs text-gray-400 mt-2 whitespace-pre-wrap">
          {{ debugState }}
        </span>
      </div>
    </div>
    <div v-else-if="noCategoriesSelected" class="p-4 text-center text-gray-500">
      <div class="flex flex-col items-center gap-2">
        <span class="font-medium">Please select categories to view data</span>
        <span class="text-sm text-gray-400">
          Use the category filters to select which elements to display
        </span>
      </div>
    </div>
    <div v-else class="p-4 text-center text-gray-500">
      <div class="flex flex-col items-center gap-2">
        <span class="font-medium">
          {{ tableName ? 'Creating table...' : 'Enter a table name to get started' }}
        </span>
        <span class="text-xs text-gray-400 mt-2 whitespace-pre-wrap">
          {{ debugState }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import DataTable from '~/components/viewer/components/tables/DataTable/index.vue'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type {
  ElementData,
  TableConfig,
  TableUpdatePayload,
  TableRowData
} from '../types'
import type { CustomParameter } from '~/composables/useUserSettings'
import { debug, DebugCategories } from '../utils/debug'

interface Props {
  selectedTableId: string
  currentTable: TableConfig | null
  isInitialized: boolean
  tableData: TableRowData[] // Changed from ElementData[] to TableRowData[]
  scheduleData: ElementData[]
  tableName: string
  currentTableId: string
  tableKey: string
  loadingError: Error | null
  mergedTableColumns: ColumnDef[]
  mergedDetailColumns: ColumnDef[]
  mergedParentParameters: CustomParameter[]
  mergedChildParameters: CustomParameter[]
}

const props = defineProps<Props>()
const showRawData = ref(true) // Always show raw data by default

const emit = defineEmits<{
  'update:both-columns': [
    updates: { parentColumns: ColumnDef[]; childColumns: ColumnDef[] }
  ]
  'table-updated': [payload: TableUpdatePayload]
  'column-visibility-change': [column: ColumnDef]
}>()

// Helper functions for debug panel
function getUniqueCategories(data: ElementData[]): string[] {
  return [...new Set(data.map((item) => item.category))]
}

function getUniqueChildCategories(data: ElementData[]): string[] {
  const categories = new Set<string>()
  data.forEach((item) => {
    item.details?.forEach((child) => {
      categories.add(child.category)
    })
  })
  return [...categories]
}

// Modified computed states for progressive loading
const hasMinimalColumns = computed(() => {
  const essentialFields = ['mark', 'category']
  return essentialFields.every((field) =>
    props.mergedTableColumns.some((col) => col.field === field && col.visible)
  )
})

const hasMinimalData = computed(() => {
  return Array.isArray(props.tableData) && props.tableData.length > 0
})

const isLoadingAdditionalData = computed(() => {
  // True if we have basic data but not all columns are loaded
  return hasMinimalData.value && props.mergedTableColumns.some((col) => !col.visible)
})

const canShowTable = computed(() => {
  // Show table if we have minimal columns and data
  const canShow = hasMinimalColumns.value && hasMinimalData.value

  debug.log(DebugCategories.STATE, 'Table display state:', {
    timestamp: new Date().toISOString(),
    canShow,
    hasMinimalColumns: hasMinimalColumns.value,
    hasMinimalData: hasMinimalData.value,
    columnsCount: props.mergedTableColumns.length,
    dataCount: props.tableData.length
  })

  return canShow
})

const noCategoriesSelected = computed(() => {
  return props.scheduleData.length === 0 && !props.loadingError && !isLoading.value
})

const isLoading = computed(() => {
  // Only consider basic initialization
  return !props.isInitialized
})

const loadingMessage = computed(() => {
  if (!props.isInitialized) return 'Initializing...'
  if (!props.selectedTableId) return 'Select a table or create a new one'
  if (!props.currentTable) return 'Loading table...'
  return 'Preparing table...'
})

const loadingDetail = computed(() => {
  if (!props.isInitialized) {
    return 'Setting up data structures...'
  }
  if (!props.selectedTableId) {
    return 'Choose an existing table or create a new one'
  }
  if (!props.currentTable) {
    return 'Loading table settings...'
  }
  return 'Almost ready...'
})

const debugState = computed(() => {
  return JSON.stringify(
    {
      initialized: props.isInitialized,
      hasTable: !!props.currentTable,
      dataStats: {
        tableData: props.tableData.length,
        scheduleData: props.scheduleData.length,
        parentColumns: props.mergedTableColumns.length,
        childColumns: props.mergedDetailColumns.length,
        parentParams: props.mergedParentParameters.length,
        childParams: props.mergedChildParameters.length,
        uniqueParentCategories: getUniqueCategories(props.scheduleData),
        uniqueChildCategories: getUniqueChildCategories(props.scheduleData)
      },
      table: {
        id: props.currentTableId,
        name: props.tableName,
        selectedId: props.selectedTableId
      },
      validation: {
        hasMinimalColumns: hasMinimalColumns.value,
        hasMinimalData: hasMinimalData.value,
        canShowTable: canShowTable.value,
        isLoading: isLoading.value,
        isLoadingAdditionalData: isLoadingAdditionalData.value
      },
      timestamp: new Date().toISOString()
    },
    null,
    2
  )
})

// Event handlers
const handleBothColumnsUpdate = (updates: {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
}) => {
  debug.log(DebugCategories.TABLE_UPDATES, 'Column update:', {
    timestamp: new Date().toISOString(),
    updates: {
      parentColumnsCount: updates.parentColumns.length,
      childColumnsCount: updates.childColumns.length
    },
    current: {
      parentColumnsCount: props.mergedTableColumns.length,
      childColumnsCount: props.mergedDetailColumns.length
    }
  })
  emit('update:both-columns', updates)
}

const handleTableUpdate = (payload: TableUpdatePayload) => {
  debug.log(DebugCategories.TABLE_UPDATES, 'Table update:', {
    timestamp: new Date().toISOString(),
    payload,
    currentTable: {
      id: props.currentTable?.id,
      name: props.currentTable?.name
    }
  })
  emit('table-updated', payload)
}

const handleColumnVisibilityChange = (column: ColumnDef) => {
  debug.log(DebugCategories.COLUMNS, 'Column visibility change:', {
    timestamp: new Date().toISOString(),
    column: {
      field: column.field,
      visible: column.visible,
      category: column.category
    },
    currentColumns: {
      parentCount: props.mergedTableColumns.length,
      childCount: props.mergedDetailColumns.length,
      visibleParentCount: props.mergedTableColumns.filter((col) => col.visible).length,
      visibleChildCount: props.mergedDetailColumns.filter((col) => col.visible).length
    }
  })
  emit('column-visibility-change', column)
}
</script>
