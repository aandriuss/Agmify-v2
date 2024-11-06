<template>
  <div>
    <!-- Loading state -->
    <div v-if="!state.initialized && !state.loadingError" class="p-4 text-center">
      <span class="text-gray-500">Loading...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="state.loadingError" class="p-4 text-center text-red-500">
      Error loading column manager: {{ state.loadingError.message }}
    </div>

    <!-- Main content -->
    <div v-else class="h-full flex flex-col">
      <LayoutDialog
        :open="open"
        :max-width="'lg'"
        :hide-closer="false"
        :prevent-close-on-click-outside="false"
        title="Column Manager"
        :buttons="{
          0: {
            text: 'Apply',
            props: { color: 'default', link: false, loading: state.isSaving },
            onClick: handleApply
          },
          1: {
            text: 'Cancel',
            props: { color: 'outline', link: false },
            onClick: handleCancel
          }
        }"
        @update:open="$emit('update:open', $event)"
      >
        <div class="flex flex-col gap-2">
          <!-- View selector -->
          <TabSelector
            :model-value="columnState.currentView.value"
            @update:model-value="columnState.currentView.value = $event"
          />

          <div class="flex gap-1 h-[400px]">
            <!-- Available Parameters Panel -->
            <div
              class="flex-1 border rounded flex flex-col overflow-hidden bg-background"
            >
              <div class="p-1 border-b bg-gray-50 flex items-center justify-between">
                <h3 class="font-medium text-sm">Available Parameters</h3>
                <FormButton
                  text
                  size="sm"
                  color="subtle"
                  :icon-right="
                    state.showFilterOptions ? ChevronUpIcon : ChevronDownIcon
                  "
                  @click="toggleFilterOptions"
                >
                  F
                </FormButton>
              </div>

              <div class="flex-1 min-h-0 overflow-auto">
                <EnhancedColumnList
                  :key="`available-${columnState.currentView.value}`"
                  :items="availableParameters"
                  mode="available"
                  :show-filter-options="state.showFilterOptions"
                  :search-term="state.searchTerm"
                  :is-grouped="state.isGrouped"
                  :sort-by="state.sortBy"
                  @drag-start="handleDragStart"
                  @drop="(e) => handleDrop(e, 'available')"
                />
              </div>
            </div>

            <!-- Active Columns Panel -->
            <div
              class="flex-1 border rounded flex flex-col overflow-hidden bg-background"
            >
              <div class="p-1 border-b bg-gray-50 flex items-center justify-between">
                <h3 class="font-medium text-sm">Active Columns</h3>
                <div class="flex items-center gap-1 text-sm">
                  <span v-if="activeColumns.length" class="text-gray-500">
                    {{ activeColumns.filter((col) => col.visible).length }}/{{
                      activeColumns.length
                    }}
                    visible
                  </span>
                  <Button
                    v-if="hasHiddenColumns"
                    icon="pi pi-eye"
                    text
                    severity="secondary"
                    size="small"
                    @click="showAllColumns"
                  >
                    Show All
                  </Button>
                </div>
              </div>

              <div class="flex-1 min-h-0">
                <EnhancedColumnList
                  :key="`active-${columnState.currentView.value}`"
                  :items="activeColumns"
                  mode="active"
                  :show-filter-options="state.showFilterOptions"
                  :search-term="state.searchTerm"
                  :is-grouped="false"
                  :sort-by="state.sortBy"
                  @update:columns="handleColumnsUpdate"
                  @add="handleAdd"
                  @remove="handleRemove"
                  @visibility-change="handleVisibilityChange"
                  @reorder="handleReorder"
                  @drag-start="handleDragStart"
                  @drop="(e, index) => handleDrop(e, 'active', index)"
                />
              </div>
            </div>
          </div>
        </div>
      </LayoutDialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, reactive } from 'vue'
import { LayoutDialog } from '@speckle/ui-components'
import { debounce } from 'lodash-es'
import Button from 'primevue/button'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/24/solid'
import { useColumnState } from '../../composables/columns/useColumnState'
import TabSelector from './TabSelector.vue'
import EnhancedColumnList from './shared/EnhancedColumnList.vue'
import type { ColumnDef, ParameterDefinition } from '../../composables/types'

// Props and emits
interface Props {
  open: boolean
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  availableParentParameters: ParameterDefinition[]
  availableChildParameters: ParameterDefinition[]
  tableId: string
}

const props = withDefaults(defineProps<Props>(), {
  open: false
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:columns': [updates: { parentColumns: ColumnDef[]; childColumns: ColumnDef[] }]
  cancel: []
}>()

// State interfaces
interface State {
  initialized: boolean
  initializing: boolean
  isSaving: boolean
  loadingError: Error | null
  selectedTableId: string
  tableName: string
  tableKey: string
  searchTerm: string
  isGrouped: boolean
  sortBy: 'name' | 'category' | 'type' | 'fixed'
  showFilterOptions: boolean
}

// State management
const { settings, loadSettings, updateNamedTable } = useUserSettings()
const state = reactive<State>({
  initialized: false,
  initializing: false,
  isSaving: false,
  loadingError: null,
  selectedTableId: props.tableId,
  tableName: '',
  tableKey: Date.now().toString(),
  searchTerm: '',
  isGrouped: true,
  sortBy: 'category',
  showFilterOptions: false
})

// Column state setup
const columnState = useColumnState({
  tableId: props.tableId,
  initialParentColumns: props.parentColumns,
  initialChildColumns: props.childColumns,
  availableParentParameters: props.availableParentParameters,
  availableChildParameters: props.availableChildParameters
})

// Computed properties
const activeColumns = computed(() => columnState.activeColumns.value)
const availableParameters = computed(() => columnState.availableParameters.value)
const hasHiddenColumns = computed(() => activeColumns.value.some((col) => !col.visible))
const currentTable = computed(
  () => settings.value?.namedTables?.[state.selectedTableId]
)

// Utility functions
function isColumnArray(value: any): value is ColumnDef[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'object' && item !== null && 'field' in item)
  )
}

// Core initialization
async function initialize() {
  if (state.initializing) return

  state.initializing = true
  try {
    await loadSettings()
    const table = settings.value?.namedTables?.[state.selectedTableId]

    if (table) {
      state.tableName = table.name
      restoreUIState()
      await loadCurrentTableState()
    }

    state.initialized = true
  } catch (error) {
    console.error('Column manager initialization failed:', error)
    state.loadingError = error as Error
  } finally {
    state.initializing = false
  }
}

// UI State management
const debouncedSaveUIState = debounce(saveUIState, 300)

async function saveUIState() {
  try {
    const currentTable = settings.value?.namedTables?.[state.selectedTableId]
    if (currentTable) {
      await updateNamedTable(state.selectedTableId, {
        ...currentTable,
        uiState: {
          ...currentTable.uiState,
          showFilterOptions: state.showFilterOptions
        }
      })
    }
  } catch (error) {
    console.error('Failed to save UI state:', error)
  }
}

function restoreUIState() {
  const currentTable = settings.value?.namedTables?.[state.selectedTableId]
  state.showFilterOptions = currentTable?.uiState?.showFilterOptions ?? false
}

function toggleFilterOptions() {
  state.showFilterOptions = !state.showFilterOptions
  debouncedSaveUIState()
}

// Column operations
async function handleColumnOperation(operation: {
  type: 'add' | 'remove' | 'reorder' | 'visibility'
  sourceList: 'active' | 'available'
  targetList?: 'active' | 'available'
  item: ColumnDef | ParameterDefinition
  sourceIndex?: number
  targetIndex?: number
  visible?: boolean
}) {
  try {
    let updatedColumns: ColumnDef[] = []

    switch (operation.type) {
      case 'add':
        if (operation.targetList === 'active') {
          updatedColumns = [
            ...activeColumns.value,
            {
              ...operation.item,
              visible: true,
              removable: true,
              order: activeColumns.value.length
            }
          ]
        }
        break

      case 'remove':
        updatedColumns = activeColumns.value.filter(
          (col) => col.field !== operation.item.field
        )
        break

      case 'reorder':
        if (
          operation.sourceIndex !== undefined &&
          operation.targetIndex !== undefined
        ) {
          updatedColumns = [...activeColumns.value]
          const [movedItem] = updatedColumns.splice(operation.sourceIndex, 1)
          updatedColumns.splice(operation.targetIndex, 0, movedItem)
          updatedColumns = updatedColumns.map((col, index) => ({
            ...col,
            order: index
          }))
        }
        break

      case 'visibility':
        updatedColumns = activeColumns.value.map((col) =>
          col.field === operation.item.field
            ? { ...col, visible: operation.visible }
            : col
        )
        break
    }

    if (updatedColumns.length > 0 || operation.type === 'remove') {
      await handleColumnsUpdate({
        parentColumns:
          columnState.currentView.value === 'parent'
            ? updatedColumns
            : columnState.parentColumns.value,
        childColumns:
          columnState.currentView.value === 'child'
            ? updatedColumns
            : columnState.childColumns.value
      })
    }

    state.tableKey = Date.now().toString()
  } catch (error) {
    console.error('Operation failed:', error)
    throw error
  }
}

// Event handlers
async function handleApply() {
  state.isSaving = true
  try {
    const currentTable = settings.value?.namedTables?.[props.tableId]
    if (!currentTable) throw new Error('Table not found')

    await updateNamedTable(props.tableId, {
      ...currentTable,
      parentColumns: columnState.parentColumns.value,
      childColumns: columnState.childColumns.value
    })

    await loadSettings()

    emit('update:columns', {
      parentColumns: columnState.parentColumns.value,
      childColumns: columnState.childColumns.value
    })
    emit('update:open', false)
  } catch (error) {
    console.error('Failed to apply changes:', error)
    throw error
  } finally {
    state.isSaving = false
  }
}

function handleCancel() {
  emit('cancel')
  emit('update:open', false)
}

// Drag and drop handlers
function handleDragStart(
  event: DragEvent,
  item: ColumnDef | ParameterDefinition,
  sourceList: 'active' | 'available'
) {
  if (!event.dataTransfer) return

  const index =
    sourceList === 'active'
      ? activeColumns.value.findIndex((col) => col.field === item.field)
      : availableParameters.value.findIndex((param) => param.field === item.field)

  event.dataTransfer.setData(
    'application/json',
    JSON.stringify({
      item,
      sourceList,
      sourceIndex: index
    })
  )
  event.dataTransfer.effectAllowed = 'move'
}

async function handleDrop(
  event: DragEvent,
  targetList: 'active' | 'available',
  targetIndex?: number
) {
  if (!event.dataTransfer) return
  event.preventDefault()

  try {
    const { item, sourceList, sourceIndex } = JSON.parse(
      event.dataTransfer.getData('application/json')
    )

    if (sourceList === targetList && targetIndex !== undefined) {
      await handleColumnOperation({
        type: 'reorder',
        sourceList,
        item,
        sourceIndex,
        targetIndex
      })
    } else if (sourceList === 'available' && targetList === 'active') {
      await handleColumnOperation({
        type: 'add',
        sourceList,
        targetList,
        item
      })
    } else if (sourceList === 'active' && targetList === 'available') {
      await handleColumnOperation({
        type: 'remove',
        sourceList,
        item
      })
    }
  } catch (error) {
    console.error('Drop handling failed:', error)
  }
}

// Column update handlers
function handleAdd(item: ParameterDefinition) {
  return handleColumnOperation({
    type: 'add',
    sourceList: 'available',
    targetList: 'active',
    item
  })
}

function handleRemove(item: ColumnDef) {
  return handleColumnOperation({
    type: 'remove',
    sourceList: 'active',
    item
  })
}

function handleReorder(fromIndex: number, toIndex: number) {
  return handleColumnOperation({
    type: 'reorder',
    sourceList: 'active',
    sourceIndex: fromIndex,
    targetIndex: toIndex,
    item: activeColumns.value[fromIndex]
  })
}

function handleVisibilityChange(column: ColumnDef, visible: boolean) {
  return handleColumnOperation({
    type: 'visibility',
    sourceList: 'active',
    item: column,
    visible
  })
}

async function showAllColumns() {
  for (const column of activeColumns.value.filter((col) => !col.visible)) {
    await handleColumnOperation({
      type: 'visibility',
      sourceList: 'active',
      item: column,
      visible: true
    })
  }
}

async function handleColumnsUpdate(updates: {
  parentColumns?: ColumnDef[]
  childColumns?: ColumnDef[]
}) {
  if (!updates) return

  try {
    if (
      columnState.currentView.value === 'parent' &&
      isColumnArray(updates.parentColumns)
    ) {
      await columnState.updateColumns(updates.parentColumns)
    } else if (
      columnState.currentView.value === 'child' &&
      isColumnArray(updates.childColumns)
    ) {
      await columnState.updateChildColumns(updates.childColumns)
    }

    state.tableKey = Date.now().toString()
  } catch (error) {
    console.error('Failed to update columns:', error)
    throw error
  }
}

async function loadCurrentTableState() {
  if (!settings.value?.namedTables) return

  const table = settings.value.namedTables[state.selectedTableId]
  if (!table) return

  columnState.updateColumns(table.parentColumns || [])
  state.tableKey = Date.now().toString()
}

// Watchers
watch(
  () => settings.value?.namedTables?.[state.selectedTableId],
  (newTable) => {
    if (newTable && state.initialized) {
      loadCurrentTableState()
    }
  },
  { deep: true }
)

watch(
  () => state.initialized,
  (newVal) => console.log('Column manager initialized state changed:', newVal)
)

watch(
  () => columnState.currentView.value,
  (newVal) => console.log('Current view changed:', newVal)
)

watch(
  () => activeColumns.value,
  (newVal) => {
    console.log('Active columns changed:', {
      count: newVal?.length,
      columns: newVal
    })
  },
  { deep: true }
)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      restoreUIState()
    }
  }
)

// Initialize on mount
onMounted(async () => {
  try {
    await initialize()
  } catch (error) {
    console.error('Component mounting failed:', error)
    state.loadingError = error as Error
  }
})
</script>
