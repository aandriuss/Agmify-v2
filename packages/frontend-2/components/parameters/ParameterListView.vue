<template>
  <div class="parameter-list-view">
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold">Parameters</h2>
      <p class="text-gray-600">View and manage parameters across all projects.</p>
    </div>

    <!-- Main Content -->
    <div class="parameter-content">
      <BaseDataTable
        :table-id="tableId"
        :table-name="tableName"
        :data="parameterData"
        :columns="columns"
        :loading="isLoading"
        :initial-state="initialState"
        @update:expanded-rows="handleExpandedRowsUpdate"
        @update:columns="handleColumnsUpdate"
        @column-reorder="handleColumnReorder"
        @table-updated="handleTableUpdated"
        @column-visibility-change="handleColumnVisibilityChange"
        @sort="handleSort"
        @filter="handleFilter"
        @error="handleError"
        @retry="handleRetry"
      >
        <template #empty>
          <div class="p-4 text-center text-gray-500">
            <div class="flex flex-col items-center gap-2">
              <span>No parameters available.</span>
              <span class="text-sm">
                Try adjusting your filters or create new parameters.
              </span>
            </div>
          </div>
        </template>

        <template #loading>
          <div class="p-4 text-center text-gray-500">
            <div class="flex flex-col items-center gap-2">
              <span>Loading parameters...</span>
            </div>
          </div>
        </template>

        <template #error>
          <div class="p-4 text-center text-red-500">
            <div class="flex flex-col items-center gap-2">
              <span>{{ currentError?.message || 'Failed to load parameters' }}</span>
              <button
                class="text-sm text-primary-600 hover:text-primary-700"
                @click="handleRetry"
              >
                Retry Loading
              </button>
            </div>
          </div>
        </template>
      </BaseDataTable>

      <!-- Action Buttons -->
      <div class="mt-4 flex justify-end gap-2">
        <FormButton color="primary" @click="handleCreateParameter">
          Create Parameter
        </FormButton>
        <FormButton
          v-if="hasSelectedParameters"
          color="outline"
          @click="handleEditParameters"
        >
          Edit Selected
        </FormButton>
      </div>
    </div>

    <!-- Error Display -->
    <div
      v-if="error"
      class="fixed bottom-4 right-4 p-4 bg-red-50 text-red-600 rounded shadow-lg"
    >
      {{ error.message }}
      <button class="ml-2 text-sm underline hover:text-red-700" @click="handleRetry">
        Retry
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { FormButton } from '@speckle/ui-components'
import BaseDataTable from '../core/tables/DataTable/BaseDataTable.vue'
import type {
  TableColumnDef,
  BaseTableRow,
  TableState
} from '../core/tables/DataTable/types'
import { TableError } from '../core/tables/DataTable/utils'
import type { ScheduleRow } from '../viewer/schedules/types'

// Props
interface Props {
  tableId: string
  tableName?: string
}

const props = withDefaults(defineProps<Props>(), {
  tableName: 'Parameters'
})

// State
const error = ref<Error | null>(null)
const currentError = computed(() => error.value)
const isLoading = ref(false)
const parameterData = ref<ScheduleRow[]>([])
const columns = ref<TableColumnDef[]>([])
const initialState = ref<TableState | undefined>(undefined)
const selectedParameters = ref<ScheduleRow[]>([])

// Computed
const hasSelectedParameters = computed(() => selectedParameters.value.length > 0)

// Event Handlers
function handleExpandedRowsUpdate(rows: BaseTableRow[]): void {
  try {
    const validRows = rows.filter((row): row is ScheduleRow => 'name' in row)
    parameterData.value = validRows
  } catch (err) {
    handleError(err)
  }
}

function handleColumnsUpdate(newColumns: TableColumnDef[]): void {
  try {
    columns.value = newColumns
  } catch (err) {
    handleError(err)
  }
}

function handleColumnReorder(event: { dragIndex: number; dropIndex: number }): void {
  try {
    const reorderedColumns = [...columns.value]
    const [movedColumn] = reorderedColumns.splice(event.dragIndex, 1)
    reorderedColumns.splice(event.dropIndex, 0, movedColumn)
    columns.value = reorderedColumns
  } catch (err) {
    handleError(err)
  }
}

function handleTableUpdated(): void {
  // Handle any necessary updates
}

function handleColumnVisibilityChange(): void {
  // Handle visibility changes
}

async function handleSort(_field: string, _order: number): Promise<void> {
  try {
    isLoading.value = true
    // Implement sorting logic here
    await new Promise((resolve) => setTimeout(resolve, 100)) // Placeholder for actual API call
  } catch (err) {
    handleError(err)
  } finally {
    isLoading.value = false
  }
}

async function handleFilter(
  _filters: Record<string, { value: unknown; matchMode: string }>
): Promise<void> {
  try {
    isLoading.value = true
    // Implement filtering logic here
    await new Promise((resolve) => setTimeout(resolve, 100)) // Placeholder for actual API call
  } catch (err) {
    handleError(err)
  } finally {
    isLoading.value = false
  }
}

async function handleCreateParameter(): Promise<void> {
  try {
    isLoading.value = true
    // Implement parameter creation logic here
    await new Promise((resolve) => setTimeout(resolve, 100)) // Placeholder for actual API call
  } catch (err) {
    handleError(err)
  } finally {
    isLoading.value = false
  }
}

async function handleEditParameters(): Promise<void> {
  try {
    isLoading.value = true
    // Implement parameter editing logic here
    await new Promise((resolve) => setTimeout(resolve, 100)) // Placeholder for actual API call
  } catch (err) {
    handleError(err)
  } finally {
    isLoading.value = false
  }
}

function handleError(err: unknown): void {
  const tableError = new TableError(
    err instanceof Error ? err.message : 'An unknown error occurred',
    err
  )
  error.value = new Error(tableError.message)
}

async function handleRetry(): Promise<void> {
  try {
    error.value = null
    isLoading.value = true
    await initialize()
  } catch (err) {
    handleError(err)
  } finally {
    isLoading.value = false
  }
}

// Initialize component
async function initialize(): Promise<void> {
  try {
    isLoading.value = true
    // Load initial data
    await new Promise((resolve) => setTimeout(resolve, 100)) // Placeholder for actual API call

    // Set initial columns
    columns.value = [
      {
        id: 'name',
        name: 'Name',
        field: 'name',
        header: 'Name',
        type: 'text',
        visible: true,
        currentGroup: 'default',
        removable: false,
        order: 0
      },
      {
        id: 'category',
        name: 'Category',
        field: 'category',
        header: 'Category',
        type: 'text',
        visible: true,
        currentGroup: 'default',
        removable: true,
        order: 1
      },
      {
        id: 'kind',
        name: 'Kind',
        field: 'kind',
        header: 'Kind',
        type: 'text',
        visible: true,
        currentGroup: 'default',
        removable: true,
        order: 2
      },
      {
        id: 'sourceValue',
        name: 'Source Value',
        field: 'sourceValue',
        header: 'Source Value',
        type: 'text',
        visible: true,
        currentGroup: 'default',
        removable: true,
        order: 3
      },
      {
        id: 'equation',
        name: 'Equation',
        field: 'equation',
        header: 'Equation',
        type: 'text',
        visible: true,
        currentGroup: 'default',
        removable: true,
        order: 4
      }
    ]

    // Set initial data
    parameterData.value = []
  } catch (err) {
    handleError(err)
  } finally {
    isLoading.value = false
  }
}

// Call initialize on component mount
initialize()
</script>

<style scoped>
.parameter-list-view {
  @apply p-6;
}

.parameter-content {
  @apply bg-white rounded-lg shadow p-6;
}
</style>
