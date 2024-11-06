<template>
  <div>
    <!-- Loading state -->
    <div v-if="!initialized" class="p-4 text-center">
      <span class="text-gray-500">Loading...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="loadingError" class="p-4 text-center text-red-500">
      Error loading column manager: {{ loadingError.message }}
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
                  :icon-right="showFilterOptions ? ChevronUpIcon : ChevronDownIcon"
                  @click="showFilterOptions = !showFilterOptions"
                >
                  F
                </FormButton>
              </div>

              <div class="flex-1 min-h-0 overflow-auto">
                <EnhancedColumnList
                  :key="`available-${columnState.currentView.value}`"
                  :items="availableParameters"
                  mode="available"
                  :show-filter-options="showFilterOptions"
                  :search-term="searchTerm"
                  :is-grouped="isGrouped"
                  :sort-by="sortBy"
                  @update:search-term="searchTerm = $event"
                  @update:is-grouped="isGrouped = $event"
                  @update:sort-by="sortBy = $event"
                  @drag-start="handleDragStart"
                  @drop="handleDropToAvailable"
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
                  :search-term="searchTerm"
                  :is-grouped="false"
                  :sort-by="sortBy"
                  @update:columns="handleColumnsUpdate"
                  @add="handleAdd"
                  @remove="handleRemove"
                  @visibility-change="handleVisibilityChange"
                  @reorder="handleReorder"
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

// Core state
const state = reactive({
  selectedTableId: props.tableId,
  tableName: '',
  tableKey: Date.now().toString(),
  initialized: false
})

// Local refs
const searchTerm = ref('')
const isGrouped = ref(true)
const sortBy = ref<'name' | 'category' | 'type' | 'fixed'>('category')
const isSaving = ref(false)
const initialized = ref(false)
const loadingError = ref<Error | null>(null)
const showFilterOptions = ref(false)

// User settings
const {
  settings,
  loading: settingsLoading,
  saveSettings,
  loadSettings,
  updateNamedTable
} = useUserSettings()

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
  try {
    console.log('Initializing component...')
    await loadSettings()

    const table = settings.value?.namedTables?.[state.selectedTableId]
    if (table) {
      state.tableName = table.name
      loadCurrentTableState()
    }

    initialized.value = true
    console.log('Component initialized successfully')
  } catch (error) {
    console.error('Error initializing component:', error)
    loadingError.value = error as Error
  }
}

// Initialize with empty arrays if no data
const localColumns = ref<ColumnDef[]>([])

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

const handleColumnsUpdate = async (newColumns: ColumnDef[]) => {
  if (!newColumns) return

  console.log('Columns updated:', newColumns)

  if (columnState.currentView.value === 'parent') {
    await columnState.updateColumns(newColumns)
  } else {
    // Handle child columns update if needed
    await columnState.updateChildColumns(newColumns)
  }

  // Force refresh
  state.tableKey = Date.now().toString()
}

const handleAdd = async (item: ParameterDefinition) => {
  console.log('Adding item:', item.field)

  const newColumn: ColumnDef = {
    ...item,
    visible: true,
    removable: true,
    order: activeColumns.value.length
  }

  const updatedColumns = [...activeColumns.value, newColumn]

  try {
    await handleColumnsUpdate({
      parentColumns: updatedColumns,
      childColumns: columnState.childColumns.value
    })

    // Force refresh
    state.tableKey = Date.now().toString()
  } catch (error) {
    console.error('Error adding column:', error)
  }
}

const handleRemove = async (item: ColumnDef) => {
  console.log('Removing item:', item.field)

  const updatedColumns = activeColumns.value.filter((col) => col.field !== item.field)

  try {
    await handleColumnsUpdate({
      parentColumns: updatedColumns,
      childColumns: columnState.childColumns.value
    })

    // Force refresh
    state.tableKey = Date.now().toString()
  } catch (error) {
    console.error('Error removing column:', error)
  }
}

const handleReorder = (fromIndex: number, toIndex: number) => {
  console.log('Reorder received:', { fromIndex, toIndex })
  // Any additional reorder handling if needed
}

// >>>>>>>>>>>>

// Drag and drop handlers
const handleDragStart = (
  event: DragEvent,
  item: ColumnDef | ParameterDefinition,
  sourceList: 'active' | 'available'
) => {
  if (!event.dataTransfer) return

  const index =
    sourceList === 'active'
      ? activeColumns.value.findIndex((col) => col.field === item.field)
      : availableParameters.value.findIndex((param) => param.field === item.field)

  console.log('Drag start:', { item: item.field, sourceList, index })

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

const handleDrop = async (event: DragEvent) => {
  if (!event.dataTransfer) return
  event.preventDefault()

  try {
    const jsonData = event.dataTransfer.getData('application/json')
    if (!jsonData) return

    const dragData = JSON.parse(jsonData)
    console.log('Drop data:', dragData)

    if (dragData.sourceList === 'active') {
      await handleReorder(
        dragData.sourceIndex,
        parseInt(event.currentTarget?.getAttribute('data-index') || '0', 10)
      )
    } else {
      const newColumn: ColumnDef = {
        ...dragData.item,
        order: activeColumns.value.length,
        visible: true,
        removable: true
      }

      await handleColumnsUpdate({
        parentColumns: [...activeColumns.value, newColumn],
        childColumns: columnState.childColumns.value
      })
    }
  } catch (error) {
    console.error('Error handling drop:', error)
  }
}

const handleDropToAvailable = async (event: DragEvent) => {
  if (!event.dataTransfer) return
  event.preventDefault()

  try {
    const jsonData = event.dataTransfer.getData('application/json')
    if (!jsonData) return

    const dragData = JSON.parse(jsonData)
    if (dragData.sourceList === 'active') {
      const updatedColumns = activeColumns.value.filter(
        (col) => col.field !== dragData.item.field
      )

      await handleColumnsUpdate({
        parentColumns: updatedColumns,
        childColumns: columnState.childColumns.value
      })
    }
  } catch (error) {
    console.error('Error handling drop to available:', error)
  }
}

const handleVisibilityChange = (column: ColumnDef, visible: boolean) => {
  const updatedColumns = activeColumns.value.map((col) =>
    col.field === column.field ? { ...col, visible } : col
  )

  handleColumnsUpdate({
    parentColumns: updatedColumns,
    childColumns: columnState.childColumns.value
  })
}

const showAllColumns = () => {
  const updatedColumns = activeColumns.value.map((col) => ({
    ...col,
    visible: true
  }))

  handleColumnsUpdate({
    parentColumns: updatedColumns,
    childColumns: columnState.childColumns.value
  })
}

// Save and Cancel handlers
const handleApply = async () => {
  isSaving.value = true
  try {
    await columnState.saveChanges()
    emit('update:columns', {
      parentColumns: columnState.parentColumns.value,
      childColumns: columnState.childColumns.value
    })
    emit('update:open', false)
  } catch (error) {
    console.error('Failed to save changes:', error)
  } finally {
    isSaving.value = false
  }
}

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

// Initialize
onMounted(initializeComponent)
</script>
