<template>
  <div>
    <!-- Debug Panel -->
    <ScheduleDebugPanel
      v-if="showDebug"
      :schedule-data="scheduleData"
      :evaluated-data="evaluatedData"
      :debug-filter="debugFilter"
      @toggle="toggleDebug"
    />

    <!-- Loading State -->
    <ScheduleLoadingState
      v-if="props.isLoading"
      :loading-message="'Loading schedule data...'"
      :loading-detail="'Please wait while we prepare your data'"
      :current-step="1"
      :total-steps="1"
    />

    <!-- Error State -->
    <ScheduleErrorState
      v-else-if="props.loadingError"
      :error="props.loadingError"
      :show-debug="showDebug"
      @retry="retryLoading"
      @show-debug="toggleDebug"
    />

    <!-- Data Table -->
    <DataTable
      v-if="props.tableData.length > 0 && !props.isLoading"
      :key="`${props.tableKey}-${props.tableData.length}`"
      :table-id="props.currentTableId"
      :table-name="props.tableName"
      :data="props.tableData"
      :columns="props.mergedTableColumns"
      :detail-columns="props.mergedDetailColumns"
      :available-parent-parameters="props.availableParentParameters"
      :available-child-parameters="props.availableChildParameters"
      :loading="props.isLoadingAdditionalData"
      @update:both-columns="handleBothColumnsUpdate"
      @table-updated="handleTableUpdate"
      @column-visibility-change="handleColumnVisibilityChange"
    />

    <!-- Status Display -->
    <div v-else class="p-4">
      <div class="text-center">
        <div class="text-lg font-semibold mb-2">Schedule Status</div>
        <div class="mt-4 text-left inline-block">
          <div class="grid grid-cols-2 gap-4">
            <!-- Data Status -->
            <div class="bg-gray-50 p-4 rounded">
              <h3 class="font-medium mb-2">Data</h3>
              <div class="space-y-2">
                <div>Raw Elements: {{ props.scheduleData.length }}</div>
                <div>Table Rows: {{ props.tableData.length }}</div>
                <div>
                  Visible Rows:
                  {{ props.tableData.filter((row) => row._visible !== false).length }}
                </div>
              </div>
            </div>

            <!-- Column Status -->
            <div class="bg-gray-50 p-4 rounded">
              <h3 class="font-medium mb-2">Columns</h3>
              <div class="space-y-2">
                <div>Table Columns: {{ props.mergedTableColumns.length }}</div>
                <div>Detail Columns: {{ props.mergedDetailColumns.length }}</div>
                <div>
                  Parent Parameters: {{ props.availableParentParameters.length }}
                </div>
                <div>Child Parameters: {{ props.availableChildParameters.length }}</div>
              </div>
            </div>

            <!-- Initialization Status -->
            <div class="bg-gray-50 p-4 rounded">
              <h3 class="font-medium mb-2">Initialization</h3>
              <div class="space-y-2">
                <div>Component: {{ props.isInitialized ? 'Ready' : 'Waiting' }}</div>
                <div>Loading: {{ props.isLoading ? 'Yes' : 'No' }}</div>
                <div>
                  Additional Loading: {{ props.isLoadingAdditionalData ? 'Yes' : 'No' }}
                </div>
              </div>
            </div>

            <!-- Categories -->
            <div class="bg-gray-50 p-4 rounded">
              <h3 class="font-medium mb-2">Categories</h3>
              <div class="space-y-2">
                <div>
                  Parent Categories: {{ props.selectedParentCategories.length }}
                </div>
                <div>Child Categories: {{ props.selectedChildCategories.length }}</div>
                <div>
                  Categories Selected: {{ !props.noCategoriesSelected ? 'Yes' : 'No' }}
                </div>
              </div>
            </div>
          </div>

          <div class="mt-6 flex justify-center space-x-4">
            <button
              class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              @click="toggleDebug"
            >
              Show Debug Panel
            </button>
            <button
              class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              @click="retryLoading"
            >
              Retry Loading
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DataTable from '../../../components/tables/DataTable/index.vue'
import type { ColumnDef } from '../../../components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '../../../../../composables/useUserSettings'
import { debug, DebugCategories } from '../../utils/debug'

// Import local components
import ScheduleDebugPanel from './ScheduleDebugPanel.vue'
import ScheduleLoadingState from './ScheduleLoadingState.vue'
import ScheduleErrorState from './ScheduleErrorState.vue'

// Import types
import type {
  TableConfig,
  TableUpdatePayload,
  TableRowData,
  ElementData
} from '../../types'

interface Props {
  selectedTableId: string
  currentTable: TableConfig | null
  isInitialized: boolean
  tableName: string
  currentTableId: string
  tableKey: string
  loadingError: Error | null
  mergedTableColumns: ColumnDef[]
  mergedDetailColumns: ColumnDef[]
  availableParentParameters: CustomParameter[]
  availableChildParameters: CustomParameter[]
  scheduleData: ElementData[]
  evaluatedData: ElementData[]
  tableData: TableRowData[]
  isLoading: boolean
  isLoadingAdditionalData: boolean
  noCategoriesSelected: boolean
  selectedParentCategories: string[]
  selectedChildCategories: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:both-columns': [
    updates: { parentColumns: ColumnDef[]; childColumns: ColumnDef[] }
  ]
  'table-updated': [payload: TableUpdatePayload]
  'column-visibility-change': [column: ColumnDef]
}>()

// Debug state
const showDebug = ref(false)
const debugFilter = ref('')

// Event handlers
const handleBothColumnsUpdate = (updates: {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
}) => {
  debug.log(DebugCategories.TABLE_UPDATES, 'Column update:', updates)
  emit('update:both-columns', updates)
}

const handleTableUpdate = (payload: TableUpdatePayload) => {
  debug.log(DebugCategories.TABLE_UPDATES, 'Table update:', payload)
  emit('table-updated', payload)
}

const handleColumnVisibilityChange = (column: ColumnDef) => {
  debug.log(DebugCategories.COLUMNS, 'Column visibility change:', column)
  emit('column-visibility-change', column)
}

// Debug panel toggle
const toggleDebug = () => {
  showDebug.value = !showDebug.value
  debug.log(DebugCategories.DEBUG, 'Debug panel toggled:', {
    timestamp: new Date().toISOString(),
    showDebug: showDebug.value,
    dataCount: props.tableData.length,
    columnsCount: props.mergedTableColumns.length,
    state: {
      isInitialized: props.isInitialized,
      isLoading: props.isLoading,
      hasError: !!props.loadingError,
      hasData: props.tableData.length > 0,
      hasColumns: props.mergedTableColumns.length > 0
    }
  })
}

// Retry loading
const retryLoading = () => {
  window.location.reload()
}
</script>

<style scoped>
.grid {
  display: grid;
}

.grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.gap-4 {
  gap: 1rem;
}

.p-4 {
  padding: 1rem;
}

.bg-gray-50 {
  background-color: rgb(249 250 251);
}

.rounded {
  border-radius: 0.25rem;
}

.space-y-2 > * + * {
  margin-top: 0.5rem;
}

.space-x-4 > * + * {
  margin-left: 1rem;
}

.mt-6 {
  margin-top: 1.5rem;
}

.text-center {
  text-align: center;
}

.text-left {
  text-align: left;
}

.font-medium {
  font-weight: 500;
}

.text-lg {
  font-size: 1.125rem;
  line-height: 1.75rem;
}

.bg-blue-500 {
  background-color: rgb(59 130 246);
}

.bg-green-500 {
  background-color: rgb(34 197 94);
}

.text-white {
  color: rgb(255 255 255);
}

.hover-bg-blue-600:hover {
  background-color: rgb(37 99 235);
}

.hover-bg-green-600:hover {
  background-color: rgb(22 163 74);
}
</style>
