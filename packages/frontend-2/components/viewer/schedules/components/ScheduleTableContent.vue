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
import type { ElementData, TableConfig, TableUpdatePayload } from '../types'
import type { CustomParameter } from '~/composables/useUserSettings'
import { debug } from '../utils/debug'

interface Props {
  selectedTableId: string
  currentTable: TableConfig | null
  isInitialized: boolean
  tableData: ElementData[]
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

// Computed states
const hasValidData = computed(() => {
  const isValid = Array.isArray(props.tableData) && props.tableData.length > 0
  debug.log('🔍 DATA VALIDATION:', {
    timestamp: new Date().toISOString(),
    isValid,
    tableDataLength: props.tableData?.length || 0,
    scheduleDataLength: props.scheduleData?.length || 0,
    firstTableItem: props.tableData?.[0],
    firstScheduleItem: props.scheduleData?.[0]
  })
  return isValid
})

const hasValidTable = computed(() => {
  const isValid = !!(
    props.isInitialized &&
    props.selectedTableId &&
    props.currentTable &&
    props.mergedTableColumns.length > 0
  )
  debug.log('🔍 TABLE VALIDATION:', {
    timestamp: new Date().toISOString(),
    isValid,
    isInitialized: props.isInitialized,
    hasSelectedTableId: !!props.selectedTableId,
    hasCurrentTable: !!props.currentTable,
    columnCount: props.mergedTableColumns.length,
    tableName: props.tableName,
    tableId: props.currentTableId
  })
  return isValid
})

const canShowTable = computed(() => {
  const canShow = hasValidTable.value && hasValidData.value
  debug.log('🔍 TABLE DISPLAY STATE:', {
    timestamp: new Date().toISOString(),
    canShow,
    hasValidTable: hasValidTable.value,
    hasValidData: hasValidData.value,
    data: {
      tableDataLength: props.tableData.length,
      scheduleDataLength: props.scheduleData.length,
      columnCount: props.mergedTableColumns.length,
      detailColumnCount: props.mergedDetailColumns.length
    },
    table: {
      id: props.currentTableId,
      name: props.tableName,
      selectedId: props.selectedTableId
    }
  })
  return canShow
})

const isLoading = computed(() => {
  const loading = !props.isInitialized || !hasValidTable.value || !hasValidData.value
  return loading
})

const loadingMessage = computed(() => {
  if (!props.isInitialized) return 'Initializing...'
  if (!props.selectedTableId) return 'Waiting for table selection...'
  if (!props.currentTable) return 'Loading table configuration...'
  if (!props.mergedTableColumns.length) return 'Loading columns...'
  if (!hasValidData.value) return 'Loading data...'
  return 'Preparing table...'
})

const loadingDetail = computed(() => {
  if (!props.isInitialized) {
    return 'Setting up data structures and loading configurations...'
  }
  if (!props.selectedTableId) {
    return 'Please select or create a table to continue'
  }
  if (!props.currentTable) {
    return 'Loading table settings and parameters...'
  }
  if (!props.mergedTableColumns.length) {
    return 'Preparing column configurations...'
  }
  if (!hasValidData.value) {
    return 'Processing BIM element data...'
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
        hasValidTable: hasValidTable.value,
        hasValidData: hasValidData.value,
        canShowTable: canShowTable.value,
        isLoading: isLoading.value
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
  debug.log('🔄 COLUMN UPDATE:', {
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
  debug.log('🔄 TABLE UPDATE:', {
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
  debug.log('🔄 COLUMN VISIBILITY CHANGE:', {
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
