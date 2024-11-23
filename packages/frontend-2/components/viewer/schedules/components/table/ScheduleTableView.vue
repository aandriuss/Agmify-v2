<template>
  <div>
    <!-- Debug Panel -->
    <DebugPanel
      v-if="showDebug"
      :schedule-data="props.scheduleData"
      :evaluated-data="props.evaluatedData"
      :table-data="props.tableData"
      :parent-elements="parentElements"
      :child-elements="childElements"
      :parent-parameter-columns="props.mergedTableColumns"
      :child-parameter-columns="props.mergedDetailColumns"
      :available-parent-headers="availableParentHeaders"
      :available-child-headers="availableChildHeaders"
      :available-parent-parameters="props.availableParentParameters"
      :available-child-parameters="props.availableChildParameters"
    />

    <!-- Loading State -->
    <ScheduleLoadingState
      v-if="props.isLoading && !hasAnyData"
      loading-message="Loading schedule data..."
      loading-detail="Please wait while we prepare your data"
      :current-step="1"
      :total-steps="1"
    />

    <!-- Error State -->
    <ScheduleErrorState
      v-else-if="props.loadingError && !hasAnyData"
      :error="props.loadingError"
      :show-debug="showDebug"
      @retry="retryLoading"
      @show-debug="toggleDebug"
    />

    <!-- Table -->
    <DataTable
      v-else-if="hasAnyData"
      :key="`${props.tableKey}-${props.evaluatedData.length}-${mergedColumns.length}`"
      :table-id="props.currentTableId"
      :table-name="props.tableName"
      :data="props.evaluatedData"
      :value="props.evaluatedData"
      :schedule-data="props.evaluatedData"
      :columns="mergedColumns"
      :detail-columns="mergedDetailColumns"
      :available-parent-parameters="props.availableParentParameters"
      :available-child-parameters="props.availableChildParameters"
      :loading="props.isLoadingAdditionalData"
      @update:both-columns="handleBothColumnsUpdate"
      @table-updated="handleTableUpdate"
      @column-visibility-change="handleColumnVisibilityChange"
    />

    <!-- Empty State -->
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
                <div>Evaluated Elements: {{ props.evaluatedData.length }}</div>
                <div>
                  Visible Elements:
                  {{
                    props.evaluatedData.filter((row) => row._visible !== false).length
                  }}
                </div>
              </div>
            </div>

            <!-- Column Status -->
            <div class="bg-gray-50 p-4 rounded">
              <h3 class="font-medium mb-2">Columns</h3>
              <div class="space-y-2">
                <div>
                  Active Table (Parent) Columns: {{ props.mergedTableColumns.length }}
                </div>
                <div>
                  Active Detail (Child) Columns: {{ props.mergedDetailColumns.length }}
                </div>
                <div>
                  Available Parent Parameters count:
                  {{ props.availableParentParameters.length }}
                </div>
                <div>
                  Available Child Parameters count:
                  {{ props.availableChildParameters.length }}
                </div>
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

            <!-- Categories section in empty state -->
            <div class="bg-gray-50 p-4 rounded">
              <h3 class="font-medium mb-2">Categories</h3>
              <div class="space-y-2">
                <div>
                  Parent Categories selected:
                  {{ props.selectedParentCategories.length }}
                </div>
                <div>
                  Child Categories selected: {{ props.selectedChildCategories.length }}
                </div>
                <div class="text-gray-600 text-sm">
                  Categories are optional - all elements are shown as parents by default
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DataTable from '../../../components/tables/DataTable/index.vue'
import type { ColumnDef } from '../../../components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'
import type {
  TableConfig,
  TableUpdatePayload,
  TableRow,
  ElementData
} from '../../types'
import { defaultColumns, defaultDetailColumns } from '../../config/defaultColumns'

// Import local components
import DebugPanel from '../../debug/DebugPanel.vue'
import ScheduleLoadingState from './ScheduleLoadingState.vue'
import ScheduleErrorState from './ScheduleErrorState.vue'

// Type guard for ElementData
function isElementData(value: unknown): value is ElementData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'mark' in value &&
    'category' in value &&
    'parameters' in value &&
    '_visible' in value
  )
}

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
  tableData: TableRow[]
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
const showDebug = ref(true)

// Ensure columns include essential fields
const mergedColumns = computed(() => {
  const essentialFields = ['mark', 'category', 'host']
  const hasField = (field: string) =>
    props.mergedTableColumns.some((col) => col.field === field)

  const columns = [...props.mergedTableColumns]
  essentialFields.forEach((field) => {
    if (!hasField(field)) {
      const defaultCol = defaultColumns.find((col) => col.field === field)
      if (defaultCol) {
        columns.unshift({ ...defaultCol })
      }
    }
  })

  return columns
})

const mergedDetailColumns = computed(() => {
  const essentialFields = ['mark', 'category', 'host']
  const hasField = (field: string) =>
    props.mergedDetailColumns.some((col) => col.field === field)

  const columns = [...props.mergedDetailColumns]
  essentialFields.forEach((field) => {
    if (!hasField(field)) {
      const defaultCol = defaultDetailColumns.find((col) => col.field === field)
      if (defaultCol) {
        columns.unshift({ ...defaultCol })
      }
    }
  })

  return columns
})

// Simplified table visibility check
const hasAnyData = computed(() => {
  // Only check data if we're initialized
  if (!props.isInitialized) {
    return false
  }

  const hasData = props.evaluatedData.length > 0
  const hasColumns = mergedColumns.value.length > 0

  return hasData || hasColumns
})

// Computed properties for relationship data
const parentElements = computed(() => {
  return props.scheduleData.filter((el): el is ElementData => {
    return isElementData(el) && !el.isChild
  })
})

const childElements = computed(() => {
  return props.scheduleData.filter((el): el is ElementData => {
    return isElementData(el) && !!el.isChild
  })
})

// Computed properties for available headers with required ColumnDef properties
const availableParentHeaders = computed(
  () =>
    props.availableParentParameters.map((param, index) => ({
      field: `param_${param.id}`,
      header: param.name,
      type: param.type === 'equation' ? 'number' : 'string',
      source: param.source || 'Parameters',
      visible: true,
      order: index
    })) as ColumnDef[]
)

const availableChildHeaders = computed(
  () =>
    props.availableChildParameters.map((param, index) => ({
      field: `param_${param.id}`,
      header: param.name,
      type: param.type === 'equation' ? 'number' : 'string',
      source: param.source || 'Parameters',
      visible: true,
      order: index
    })) as ColumnDef[]
)

// Event handlers
function handleBothColumnsUpdate(updates: {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
}): void {
  emit('update:both-columns', updates)
}

function handleTableUpdate(payload: TableUpdatePayload): void {
  emit('table-updated', payload)
}

function handleColumnVisibilityChange(column: ColumnDef): void {
  emit('column-visibility-change', column)
}

function toggleDebug(): void {
  showDebug.value = !showDebug.value
}

function retryLoading(): void {
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
