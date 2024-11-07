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
    <div class="h-full flex flex-col">
      <LayoutDialog
        :open="open"
        :max-width="'lg'"
        :hide-closer="false"
        mode="out-in"
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
            :model-value="state.view"
            @update:model-value="handleViewChange"
          />

          <!-- Lists container -->
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
                  @click="state.showFilterOptions = !state.showFilterOptions"
                >
                  Filter Options
                </FormButton>
              </div>

              <EnhancedColumnList
                :key="`available-${state.view}-${state.refreshKey}`"
                :items="availableParameters"
                mode="available"
                :show-filter-options="state.showFilterOptions"
                :search-term="state.searchTerm"
                :is-grouped="state.isGrouped"
                :sort-by="state.sortBy"
                :drop-position="dragState.dropPosition"
                @update:search-term="handleSearchUpdate"
                @update:is-grouped="handleGroupingUpdate"
                @update:sort-by="handleSortUpdate"
                @add="handleAdd"
                @remove="handleRemove"
                @drag-start="handleDragStart"
                @drag-end="handleDragEnd"
                @drag-enter="handleDragEnter"
                @drop="handleDrop"
                @visibility-change="handleVisibilityChange"
              />
            </div>

            <!-- Active Columns Panel -->
            <div
              class="flex-1 border rounded flex flex-col overflow-hidden bg-background"
            >
              <div class="p-1 border-b bg-gray-50 flex items-center justify-between">
                <h3 class="font-medium text-sm">Active Columns</h3>
                <div class="flex items-center gap-1 text-sm">
                  <span v-if="activeColumns?.length" class="text-gray-500">
                    {{ activeColumns.filter((col) => col?.visible).length }}/{{
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

              <EnhancedColumnList
                :key="`active-${state.view}-${state.refreshKey}`"
                :items="activeColumns"
                mode="active"
                :show-filter-options="false"
                :drop-position="dragState.dropPosition"
                @add="handleAdd"
                @remove="handleRemove"
                @drag-start="handleDragStart"
                @drag-end="handleDragEnd"
                @drag-enter="handleDragEnter"
                @drop="handleDrop"
                @visibility-change="handleVisibilityChange"
                @reorder="handleReorder"
              />
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
import { useColumnManager } from '~/components/viewer/components/tables/DataTable/composables/columns/useColumnManager'

// Props and emits
// interface Props {
//   open: boolean
//   parentColumns: ColumnDef[]
//   childColumns: ColumnDef[]
//   availableParentParameters: ParameterDefinition[]
//   availableChildParameters: ParameterDefinition[]
//   tableId: string
// }

// Props and emits
const props = withDefaults(
  defineProps<{
    open: boolean
    parentColumns: ColumnDef[]
    childColumns: ColumnDef[]
    availableParentParameters: ParameterDefinition[]
    availableChildParameters: ParameterDefinition[]
    tableId: string
    debug?: boolean
  }>(),
  {
    debug: false
  }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:columns': [updates: { parentColumns: ColumnDef[]; childColumns: ColumnDef[] }]
  cancel: []
}>()

const columnManager = useColumnManager({
  tableId: props.tableId,
  initialParentColumns: props.parentColumns,
  initialChildColumns: props.childColumns,
  availableParentParameters: Array.isArray(props.availableParentParameters)
    ? props.availableParentParameters
    : [],
  availableChildParameters: Array.isArray(props.availableChildParameters)
    ? props.availableChildParameters
    : []
})

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
  view: 'parent' | 'child'
}

// State management
const { settings, loadSettings, updateNamedTable } = useUserSettings()

// Drag state
const dragState = reactive({
  dragging: null as string | null,
  sourceList: null as typeof parentColumnsRef | typeof childColumnsRef | null,
  sourceIndex: null as number | null,
  targetIndex: null as number | null,
  dropPosition: null as 'above' | 'below' | null
})

// Component state
const state = reactive<State>({
  view: 'parent' as 'parent' | 'child',
  initialized: false,
  initializing: false,
  isSaving: false,
  loadingError: null as Error | null,
  selectedTableId: props.tableId,
  tableName: '',
  tableKey: Date.now().toString(),
  searchTerm: '',
  isGrouped: true,
  sortBy: 'category' as const,
  refreshKey: 0,
  lastUpdateTime: Date.now(),
  error: null as Error | null,
  showFilterOptions: false,
  currentColumns: [] as ColumnDef[]
})

// Column state setup
const columnState = useColumnState({
  tableId: props.tableId,
  initialParentColumns: props.parentColumns,
  initialChildColumns: props.childColumns,
  availableParentParameters: props.availableParentParameters,
  availableChildParameters: props.availableChildParameters
})

// Column management
const parentColumnsRef = ref<ColumnDef[]>(validateColumns(props.parentColumns))
const childColumnsRef = ref<ColumnDef[]>(validateColumns(props.childColumns))

// Initialize columns
onMounted(() => {
  parentColumnsRef.value = validateColumns(props.parentColumns) || []
  childColumnsRef.value = validateColumns(props.childColumns) || []
  state.initialized = true
  refreshLists()
})
// Initialize on mount
onMounted(async () => {
  try {
    await initialize()
  } catch (error) {
    console.error('Component mounting failed:', error)
    state.loadingError = error as Error
  }
})

// Computed properties
const activeColumns = computed({
  get: () => {
    const columns =
      state.view === 'parent' ? parentColumnsRef.value : childColumnsRef.value
    return (
      columns?.map((col, index) => ({
        ...col,
        order: col.order ?? index,
        visible: col.visible ?? true
      })) || []
    )
  },
  set: (newColumns) => {
    if (state.view === 'parent') {
      parentColumnsRef.value = [...newColumns]
    } else {
      childColumnsRef.value = [...newColumns]
    }
  }
})

const availableParameters = computed(() => {
  const params =
    state.view === 'parent'
      ? props.availableParentParameters
      : props.availableChildParameters

  // Add null check
  if (!params) return []

  const activeFields = new Set(activeColumns.value?.map((col) => col.field) || [])
  return params.filter((param) => !activeFields.has(param.field))
})

const hasHiddenColumns = computed(() => activeColumns.value.some((col) => !col.visible))

// Validation helpers
function validateColumns(columns: any[]): ColumnDef[] {
  if (!Array.isArray(columns)) {
    console.warn('Invalid columns data:', columns)
    return []
  }

  return (
    columns.filter(
      (col) => col && typeof col === 'object' && 'field' in col && 'header' in col
    ) || []
  )
}

function refreshLists() {
  if (!parentColumnsRef.value) parentColumnsRef.value = []
  if (!childColumnsRef.value) childColumnsRef.value = []

  state.refreshKey++
  state.lastUpdateTime = Date.now()
}

// kkkkkk
function clearDragState() {
  dragState.dragging = null
  dragState.sourceList = null
  dragState.sourceIndex = null
  dragState.targetIndex = null
  dragState.dropPosition = null
}

// Event handlers
function handleViewChange(view: 'parent' | 'child') {
  state.view = view
  refreshLists()
}

function handleDrop(event: DragEvent, targetIndex?: number) {
  if (!dragState.dragging) return

  try {
    const currentColumns = [...activeColumns.value]
    const sourceIndex = currentColumns.findIndex(
      (col) => col.field === dragState.dragging
    )

    if (sourceIndex === -1) {
      // Item comes from available list
      const sourceItem = availableParameters.value.find(
        (p) => p.field === dragState.dragging
      )
      if (sourceItem) {
        const newColumn: ColumnDef = {
          ...sourceItem,
          visible: true,
          removable: true,
          order: currentColumns.length
        }
        currentColumns.push(newColumn)
      }
    } else if (typeof targetIndex === 'number') {
      // Reordering within active list
      const [moved] = currentColumns.splice(sourceIndex, 1)
      currentColumns.splice(targetIndex, 0, moved)
    }

    // Update the columns with proper order
    const updatedColumns = currentColumns.map((col, index) => ({
      ...col,
      order: index
    }))

    // Update the appropriate ref
    if (state.view === 'parent') {
      parentColumnsRef.value = updatedColumns
    } else {
      childColumnsRef.value = updatedColumns
    }

    // Force refresh
    state.refreshKey++

    // Emit update
    emit('update:columns', {
      parentColumns: parentColumnsRef.value,
      childColumns: childColumnsRef.value
    })
  } catch (error) {
    console.error('Drop handling error:', error)
  } finally {
    clearDragState()
  }
}

function handleDragStart(
  event: DragEvent,
  item: ColumnDef | ParameterDefinition,
  index: number
) {
  dragState.dragging = item.field
  dragState.sourceList = state.view
  dragState.sourceIndex = index
}

function handleDragEnd(event: DragEvent) {
  // Handle drop outside
  if (!event.dataTransfer?.dropEffect || event.dataTransfer.dropEffect === 'none') {
    if (dragState.dragging) {
      const currentColumns = activeColumns.value.filter(
        (col) => col.field !== dragState.dragging
      )

      if (state.view === 'parent') {
        parentColumnsRef.value = currentColumns
      } else {
        childColumnsRef.value = currentColumns
      }

      state.refreshKey++

      emit('update:columns', {
        parentColumns: parentColumnsRef.value,
        childColumns: childColumnsRef.value
      })
    }
  }
  clearDragState()
}

function handleDragEnter(event: DragEvent, index: number) {
  if (!event.currentTarget || !dragState.dragging) return

  const element = event.currentTarget as HTMLElement
  const rect = element.getBoundingClientRect()
  const mouseY = event.clientY
  const threshold = rect.top + rect.height / 2

  dragState.targetIndex = index
  dragState.dropPosition = mouseY < threshold ? 'above' : 'below'
}

function handleAdd(item: ParameterDefinition) {
  const newColumn: ColumnDef = {
    field: item.field,
    header: item.header,
    category: item.category,
    visible: true,
    removable: true,
    order: activeColumns.value.length
  }

  if (state.view === 'parent') {
    parentColumnsRef.value = [...parentColumnsRef.value, newColumn]
  } else {
    childColumnsRef.value = [...childColumnsRef.value, newColumn]
  }

  refreshLists()
}

function handleRemove(column: ColumnDef) {
  if (!column.removable) return

  const columns =
    state.view === 'parent' ? parentColumnsRef.value : childColumnsRef.value

  const updated = columns
    .filter((col) => col.field !== column.field)
    .map((col, index) => ({ ...col, order: index }))

  if (state.view === 'parent') {
    parentColumnsRef.value = updated
  } else {
    childColumnsRef.value = updated
  }

  refreshLists()
}

function handleVisibilityChange(column: ColumnDef, visible: boolean) {
  const columns =
    state.view === 'parent' ? parentColumnsRef.value : childColumnsRef.value

  const updated = columns.map((col) =>
    col.field === column.field ? { ...col, visible } : col
  )

  if (state.view === 'parent') {
    parentColumnsRef.value = updated
  } else {
    childColumnsRef.value = updated
  }

  refreshLists()
}

function handleReorder(fromIndex: number, toIndex: number) {
  const columns = [...activeColumns.value]
  const [moved] = columns.splice(fromIndex, 1)
  columns.splice(toIndex, 0, moved)

  const reordered = columns.map((col, index) => ({ ...col, order: index }))

  if (state.view === 'parent') {
    parentColumnsRef.value = reordered
  } else {
    childColumnsRef.value = reordered
  }

  refreshLists()
}

function handleSearchUpdate(value: string) {
  state.searchTerm = value
}

function handleGroupingUpdate(value: boolean) {
  state.isGrouped = value
}

function handleSortUpdate(value: typeof state.sortBy) {
  state.sortBy = value
}

async function handleApply() {
  state.isSaving = true
  try {
    emit('update:columns', {
      parentColumns: parentColumnsRef.value,
      childColumns: childColumnsRef.value
    })
    emit('update:open', false)
  } catch (error) {
    console.error('Failed to apply changes:', error)
    state.loadingError = error as Error
  } finally {
    state.isSaving = false
  }
}

function handleCancel() {
  emit('cancel')
  emit('update:open', false)
}

function showAllColumns() {
  const columns =
    state.view === 'parent' ? parentColumnsRef.value : childColumnsRef.value

  const updated = columns.map((col) => ({ ...col, visible: true }))

  if (state.view === 'parent') {
    parentColumnsRef.value = updated
  } else {
    childColumnsRef.value = updated
  }

  refreshLists()
}

// Event handlers

const currentTable = computed(
  () => settings.value?.namedTables?.[state.selectedTableId]
)

// Methods
function updateView(view: 'parent' | 'child') {
  state.view = view
  columnManager.setView(view)
}

// Utility functions
function isColumnArray(value: any): value is ColumnDef[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'object' && item !== null && 'field' in item)
  )
}

// Core initialization
async function initialize() {
  if (state.initializing || state.initialized) return

  state.initializing = true
  try {
    await loadSettings()

    console.log('Initialization data:', {
      parentColumnsCount: props.parentColumns?.length,
      childColumnsCount: props.childColumns?.length,
      availableParentCount: props.availableParentParameters?.length,
      availableChildCount: props.availableChildParameters?.length
    })

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
    const isParentView = columnState.currentView.value === 'parent'

    switch (operation.type) {
      case 'add':
        if (operation.targetList === 'active') {
          const currentColumns = isParentView
            ? columnState.parentColumns.value
            : columnState.childColumns.value

          updatedColumns = [
            ...currentColumns,
            {
              ...operation.item,
              visible: true,
              removable: true,
              order: currentColumns.length
            }
          ]
        }
        break

      case 'remove':
        const columnsToFilter = isParentView
          ? columnState.parentColumns.value
          : columnState.childColumns.value

        updatedColumns = columnsToFilter.filter(
          (col) => col.field !== operation.item.field
        )
        break

      case 'reorder':
        if (
          operation.sourceIndex !== undefined &&
          operation.targetIndex !== undefined
        ) {
          const columnsToReorder = isParentView
            ? columnState.parentColumns.value
            : columnState.childColumns.value

          updatedColumns = [...columnsToReorder]
          const [movedItem] = updatedColumns.splice(operation.sourceIndex, 1)
          updatedColumns.splice(operation.targetIndex, 0, movedItem)
          updatedColumns = updatedColumns.map((col, index) => ({
            ...col,
            order: index
          }))
        }
        break

      case 'visibility':
        const columnsToUpdate = isParentView
          ? columnState.parentColumns.value
          : columnState.childColumns.value

        updatedColumns = columnsToUpdate.map((col) =>
          col.field === operation.item.field
            ? { ...col, visible: operation.visible }
            : col
        )
        break
    }

    if (updatedColumns.length > 0 || operation.type === 'remove') {
      await handleColumnsUpdate({
        parentColumns: isParentView ? updatedColumns : columnState.parentColumns.value,
        childColumns: !isParentView ? updatedColumns : columnState.childColumns.value
      })
    }

    state.tableKey = Date.now().toString()
  } catch (error) {
    console.error('Operation failed:', error)
    throw error
  }
}
// Column update handlers

function handleColumnsUpdate(updatedColumns: ColumnDef[]) {
  if (!updatedColumns?.length) return

  emit('update:columns', {
    parentColumns:
      state.view === 'parent'
        ? updatedColumns
        : columnManager.columnState.value.activeColumns,
    childColumns:
      state.view === 'child'
        ? updatedColumns
        : columnManager.columnState.value.activeColumns
  })
}

async function loadCurrentTableState() {
  if (!settings.value?.namedTables) return

  const table = settings.value.namedTables[state.selectedTableId]
  if (!table) return

  // Update both parent and child columns
  if (table.parentColumns) {
    await columnState.updateColumns(table.parentColumns, 'parent')
  }
  if (table.childColumns) {
    await columnState.updateColumns(table.childColumns, 'child')
  }

  state.tableKey = Date.now().toString()
}

// Watchers
watch(
  () => columnManager.columnState.value,
  (state) => {
    console.log('Column state changed:', {
      activeCount: state.activeColumns?.length,
      availableCount: state.availableParameters?.length,
      view: columnManager.currentView.value
    })
  },
  { deep: true }
)

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

// Add debug logging
watch(
  () => columnManager.columnState.value,
  (state) => {
    console.log('Column state changed:', {
      activeCount: state.activeColumns?.length,
      availableCount: state.availableParameters?.length,
      view: columnManager.currentView.value
    })
  },
  { deep: true }
)

// Add watch for props changes
watch(
  () => props.parentColumns,
  (newCols) => {
    if (!dragState.dragging) {
      // Only update if not dragging
      parentColumnsRef.value = validateColumns(newCols)
    }
  }
)

watch(
  () => props.childColumns,
  (newCols) => {
    if (!dragState.dragging) {
      // Only update if not dragging
      childColumnsRef.value = validateColumns(newCols)
    }
  }
)

// Debug watchers
if (props.debug) {
  watch(
    () => availableParameters.value,
    (params) => {
      console.log('Available parameters updated:', {
        view: state.view,
        count: params.length,
        params: params.map((p) => p.field)
      })
    }
  )

  watch(
    [parentColumnsRef, childColumnsRef],
    ([parent, child]) => {
      console.log('Columns state:', {
        parent: parent?.length || 0,
        child: child?.length || 0,
        view: state.view,
        timestamp: Date.now()
      })
    },
    { immediate: true }
  )

  watch(
    () => activeColumns.value,
    (cols) => {
      console.log('Active columns updated:', {
        view: state.view,
        count: cols.length,
        columns: cols.map((c) => c.field)
      })
    }
  )
}

watch(
  () => state.view,
  () => {
    state.refreshKey++
  }
)
</script>
