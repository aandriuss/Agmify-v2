<template>
  <div>
    <!-- Loading state -->
    <div
      v-if="!columnManager.state.initialized && !columnManager.state.loadingError"
      class="p-4 text-center"
    >
      <span class="text-gray-500">Loading...</span>
    </div>

    <!-- Error state -->
    <div
      v-else-if="columnManager.state.loadingError"
      class="p-4 text-center text-red-500"
    >
      Error loading column manager: {{ columnManager.state.loadingError.message }}
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
            props: { color: 'default', link: false, loading: isSaving },
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
                    columnManager.state.showFilterOptions
                      ? ChevronUpIcon
                      : ChevronDownIcon
                  "
                  @click="columnManager.toggleFilterOptions()"
                >
                  F
                </FormButton>
              </div>

              <div class="flex-1 min-h-0 overflow-auto">
                <EnhancedColumnList
                  :key="`available-${columnState.currentView.value}`"
                  :items="availableParameters"
                  mode="available"
                  :show-filter-options="columnManager.state.showFilterOptions"
                  :search-term="columnManager.state.searchTerm"
                  :is-grouped="columnManager.state.isGrouped"
                  :sort-by="columnManager.state.sortBy"
                  @drag-start="columnManager.handleDragStart"
                  @drop="(e) => columnManager.handleDrop(e, 'available')"
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
                  :show-filter-options="columnManager.state.showFilterOptions"
                  :search-term="columnManager.state.searchTerm"
                  :is-grouped="false"
                  :sort-by="columnManager.state.sortBy"
                  @update:columns="handleColumnsUpdate"
                  @add="handleAdd"
                  @remove="handleRemove"
                  @visibility-change="columnManager.handleVisibilityChange"
                  @reorder="handleReorder"
                  @drag-start="columnManager.handleDragStart"
                  @drop="(e, index) => columnManager.handleDrop(e, 'active', index)"
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
import { ref, computed, watch } from 'vue'
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

// User settings
const {
  settings,
  loadSettings,
  updateNamedTable, // Add this
  saveSettings
} = useUserSettings()

interface UIState {
  showFilterOptions: boolean
}

interface TableSettings {
  name: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  categoryFilters: {
    selectedParentCategories: string[]
    selectedChildCategories: string[]
  }
  uiState?: UIState
}

interface ColumnOperation {
  type: 'add' | 'remove' | 'reorder' | 'visibility'
  sourceList: 'active' | 'available'
  targetList?: 'active' | 'available'
  item: ColumnDef | ParameterDefinition
  sourceIndex?: number
  targetIndex?: number
  visible?: boolean
}

interface ColumnManagerState {
  selectedTableId: string
  tableName: string
  tableKey: string
  initialized: boolean
  initializing: boolean
  isSaving: boolean
  loadingError: Error | null
  searchTerm: string
  isGrouped: boolean
  sortBy: 'name' | 'category' | 'type' | 'fixed'
  showFilterOptions: boolean
}

function isColumnArray(value: any): value is ColumnDef[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'object' && item !== null && 'field' in item)
  )
}

// Column Manager core setup
const columnManager = {
  state: reactive<ColumnManagerState>({
    selectedTableId: props.tableId,
    tableName: '',
    tableKey: Date.now().toString(),
    initialized: false,
    initializing: false,
    isSaving: false,
    loadingError: null,
    searchTerm: '',
    isGrouped: true,
    sortBy: 'category',
    showFilterOptions: false
  }),

  async initialize() {
    if (this.state.initializing) return

    this.state.initializing = true
    try {
      await loadSettings()
      const table = settings.value?.namedTables?.[this.state.selectedTableId]

      if (table) {
        this.state.tableName = table.name
        this.restoreUIState()
        await loadCurrentTableState()
      }

      this.state.initialized = true
    } catch (error) {
      console.error('Column manager initialization failed:', error)
      this.state.loadingError = error as Error
    } finally {
      this.state.initializing = false
    }
  },

  debouncedSaveUIState: debounce(function (this: typeof columnManager) {
    return this.saveUIState()
  }, 300),

  // Core operations handler
  async handleOperation(operation: ColumnOperation) {
    console.log('Processing operation:', operation)

    try {
      let updatedColumns: ColumnDef[] = []

      switch (operation.type) {
        case 'add':
          if (operation.targetList === 'active') {
            const newColumn: ColumnDef = {
              ...operation.item,
              visible: true,
              removable: true,
              order: activeColumns.value.length
            }
            updatedColumns = [...activeColumns.value, newColumn]
          }
          break

        case 'remove':
          if (operation.sourceList === 'active') {
            updatedColumns = activeColumns.value.filter(
              (col) => col.field !== operation.item.field
            )
          }
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
          if (operation.item && operation.visible !== undefined) {
            updatedColumns = activeColumns.value.map((col) =>
              col.field === operation.item.field
                ? { ...col, visible: operation.visible }
                : col
            )
          }
          break
      }

      // Only update if we have columns to update
      if (updatedColumns.length > 0 || operation.type === 'remove') {
        const updates = {
          parentColumns:
            columnState.currentView.value === 'parent'
              ? updatedColumns
              : columnState.parentColumns.value,
          childColumns:
            columnState.currentView.value === 'child'
              ? updatedColumns
              : columnState.childColumns.value
        }

        await handleColumnsUpdate(updates)
      }

      columnManager.state.tableKey = Date.now().toString()
    } catch (error) {
      console.error('Operation failed:', error)
      throw error
    }
  },

  // Drag & Drop handlers
  handleDragStart(
    event: DragEvent,
    item: ColumnDef | ParameterDefinition,
    sourceList: 'active' | 'available'
  ) {
    if (!event.dataTransfer) return

    const index =
      sourceList === 'active'
        ? activeColumns.value.findIndex((col) => col.field === item.field)
        : availableParameters.value.findIndex((param) => param.field === item.field)

    const transferData = {
      item,
      sourceList,
      sourceIndex: index
    }

    event.dataTransfer.setData('application/json', JSON.stringify(transferData))
    event.dataTransfer.effectAllowed = 'move'
  },

  toggleFilterOptions() {
    this.state.showFilterOptions = !this.state.showFilterOptions
    this.debouncedSaveUIState()
  },

  async saveUIState() {
    try {
      const currentTable = settings.value?.namedTables?.[this.state.selectedTableId]
      if (currentTable) {
        const updatedTable = {
          ...currentTable,
          uiState: {
            ...currentTable.uiState,
            showFilterOptions: this.state.showFilterOptions
          }
        }

        await updateNamedTable(this.state.selectedTableId, updatedTable)
        console.log('UI state saved successfully')
      }
    } catch (error) {
      console.error('Failed to save UI state:', error)
    }
  },

  // Add method to restore UI state
  restoreUIState() {
    const currentTable = settings.value?.namedTables?.[this.state.selectedTableId]
    if (currentTable?.uiState) {
      this.state.showFilterOptions = currentTable.uiState.showFilterOptions ?? false
      console.log('UI state restored:', this.state.showFilterOptions)
    } else {
      this.state.showFilterOptions = false // Default to closed
    }
  },

  async handleDrop(
    event: DragEvent,
    targetList: 'active' | 'available',
    targetIndex?: number
  ) {
    if (!event.dataTransfer) return
    event.preventDefault()

    try {
      const transferData = JSON.parse(event.dataTransfer.getData('application/json'))
      const { item, sourceList, sourceIndex } = transferData

      console.log('Drop handling:', {
        sourceList,
        targetList,
        sourceIndex,
        targetIndex,
        item
      })

      if (sourceList === targetList && targetIndex !== undefined) {
        // Reordering within same list
        if (sourceIndex !== targetIndex) {
          await columnManager.handleOperation({
            type: 'reorder',
            sourceList,
            item,
            sourceIndex,
            targetIndex
          })
        }
      } else if (sourceList === 'available' && targetList === 'active') {
        // Adding new column
        await columnManager.handleOperation({
          type: 'add',
          sourceList,
          targetList,
          item
        })
      } else if (sourceList === 'active' && targetList === 'available') {
        // Removing column
        await columnManager.handleOperation({
          type: 'remove',
          sourceList,
          item
        })
      }
    } catch (error) {
      console.error('Drop handling failed:', error)
    }
  },

  // UI handlers
  async handleVisibilityChange(column: ColumnDef, visible: boolean) {
    await columnManager.handleOperation({
      type: 'visibility',
      sourceList: 'active',
      item: column,
      visible
    })
  },

  async showAllColumns() {
    const operations = activeColumns.value
      .filter((col) => !col.visible)
      .map((col) => ({
        type: 'visibility' as const,
        sourceList: 'active' as const,
        item: col,
        visible: true
      }))

    for (const operation of operations) {
      await columnManager.handleOperation(operation)
    }
  }
}

// Remove duplicate state and use columnManager's state
const state = columnManager.state

// Local refs
const isSaving = ref(false)
const initialized = ref(false)
const loadingError = ref<Error | null>(null)

// Column state
const columnState = useColumnState({
  tableId: props.tableId,
  initialParentColumns: props.parentColumns,
  initialChildColumns: props.childColumns,
  availableParentParameters: props.availableParentParameters,
  availableChildParameters: props.availableChildParameters
})

// Computed values
const activeColumns = computed(() => columnState.activeColumns.value)
const availableParameters = computed(() => columnState.availableParameters.value)
const hasHiddenColumns = computed(() => activeColumns.value.some((col) => !col.visible))
const currentTable = computed(
  () => settings.value?.namedTables?.[state.selectedTableId]
)

// State management functions
const loadCurrentTableState = () => {
  if (!settings.value?.namedTables) {
    console.warn('No settings available')
    return
  }

  const table = settings.value.namedTables[state.selectedTableId]
  if (!table) {
    console.warn('Current table not found:', state.selectedTableId)
    return
  }

  console.log('Loading current table state:', {
    tableId: state.selectedTableId,
    parentColumns: table.parentColumns?.length,
    childColumns: table.childColumns?.length
  })

  columnState.updateColumns(table.parentColumns || [])
  state.tableKey = Date.now().toString()
}

// Initialize component
const initializeComponent = async () => {
  console.log('Starting component initialization...')
  try {
    await loadSettings()
    console.log('Settings loaded:', {
      hasSettings: !!settings.value,
      hasNamedTables: !!settings.value?.namedTables,
      tableId: state.selectedTableId
    })

    const table = settings.value?.namedTables?.[state.selectedTableId]
    console.log('Current table:', {
      found: !!table,
      name: table?.name,
      parentColumnsCount: table?.parentColumns?.length,
      childColumnsCount: table?.childColumns?.length
    })

    if (table) {
      state.tableName = table.name
      await loadCurrentTableState()
    }

    // Move this after all initialization is complete
    columnManager.state.initialized = true
    initialized.value = true

    console.log('Initialization complete:', {
      state: columnManager.state,
      activeColumnsCount: activeColumns.value?.length,
      availableParametersCount: availableParameters.value?.length
    })
  } catch (error) {
    console.error('Initialization failed:', error)
    columnManager.state.loadingError = error as Error
    loadingError.value = error as Error
  }
}

// Initialize with empty arrays if no data
const localColumns = ref<ColumnDef[]>([])

// Event handlers
const handleApply = async () => {
  columnManager.state.isSaving = true
  try {
    // Save the current UI state along with other changes
    await columnState.saveChanges()
    // Ensure UI state is saved
    await columnManager.saveUIState()

    emit('update:columns', {
      parentColumns: columnState.parentColumns.value,
      childColumns: columnState.childColumns.value
    })
    emit('update:open', false)
  } catch (error) {
    console.error('Failed to save changes:', error)
  } finally {
    columnManager.state.isSaving = false
  }
}

// Update template bindings
const handleAdd = (item: ParameterDefinition) =>
  columnManager.handleOperation({
    type: 'add',
    sourceList: 'available',
    targetList: 'active',
    item
  })

const handleRemove = (item: ColumnDef) =>
  columnManager.handleOperation({
    type: 'remove',
    sourceList: 'active',
    item
  })

const handleReorder = (fromIndex: number, toIndex: number) =>
  columnManager.handleOperation({
    type: 'reorder',
    sourceList: 'active',
    sourceIndex: fromIndex,
    targetIndex: toIndex,
    item: activeColumns.value[fromIndex]
  })

// Watch for props updates
watch(
  () => props.parentColumns,
  (newColumns) => {
    if (newColumns) {
      localColumns.value = [...newColumns]
    }
  },
  { immediate: true }
)

const handleColumnsUpdate = async (updates: {
  parentColumns?: ColumnDef[]
  childColumns?: ColumnDef[]
}) => {
  console.log('Handling columns update:', updates)

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

  if (
    columnState.currentView.value === 'parent' &&
    isColumnArray(updates.parentColumns)
  ) {
    await columnState.updateColumns(updates.parentColumns)
  }
}

const showAllColumns = () => columnManager.showAllColumns()

// Save and Cancel handlers

const handleCancel = () => {
  emit('cancel')
  emit('update:open', false)
}

// Watchers
watch(
  () => settings.value?.namedTables?.[state.selectedTableId],
  (newTable) => {
    if (newTable && initialized.value) {
      console.log('Settings changed:', {
        tableId: state.selectedTableId,
        hasTable: true
      })
      loadCurrentTableState()
    }
  },
  { deep: true }
)

// Add these watchers to track state changes
watch(
  () => columnManager.state.initialized,
  (newVal) => {
    console.log('Column manager initialized state changed:', newVal)
  }
)

watch(
  () => columnState.currentView.value,
  (newVal) => {
    console.log('Current view changed:', newVal)
  }
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
      columnManager.restoreUIState()
    }
  }
)

// Initialize
onMounted(async () => {
  try {
    await columnManager.initialize()
    await initializeComponent()
  } catch (error) {
    console.error('Component mounting failed:', error)
    columnManager.state.loadingError = error as Error
  }
})
</script>
