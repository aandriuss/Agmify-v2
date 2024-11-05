<template>
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
        <div class="flex-1 border rounded flex flex-col overflow-hidden bg-background">
          <div class="p-1 border-b bg-gray-50 flex items-center justify-between">
            <h3 class="font-medium text-sm">Available Parameters</h3>
          </div>

          <div class="flex-1 min-h-0 overflow-auto">
            <EnhancedColumnList
              :key="`available-${columnState.currentView.value}`"
              :items="availableParameters"
              mode="available"
              :search-term="searchTerm"
              :is-grouped="isGrouped"
              :sort-by="sortBy"
              @drag-start="(event, item) => handleDragStart(event, item, 'available')"
              @drop="handleDropToAvailable"
            />
          </div>
        </div>

        <!-- Active Columns Panel -->
        <div class="flex-1 border rounded flex flex-col overflow-hidden bg-background">
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
              :key="`active-${columnState.currentView.value}-${activeColumns.length}`"
              :items="activeColumns"
              mode="active"
              @drag-start="(event, item) => handleDragStart(event, item, 'active')"
              @drop="handleDrop"
              @visibility-change="handleVisibilityChange"
            />
          </div>
        </div>
      </div>
    </div>
  </LayoutDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { LayoutDialog } from '@speckle/ui-components'
import Button from 'primevue/button'

import { useColumnState } from '../../composables/columns/useColumnState'
import TabSelector from './TabSelector.vue'
import EnhancedColumnList from './shared/EnhancedColumnList.vue'
import type { ColumnDef, ParameterDefinition } from '../../composables/types'

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

// Core state management
const columnState = useColumnState({
  tableId: props.tableId,
  initialParentColumns: props.parentColumns,
  initialChildColumns: props.childColumns,
  availableParentParameters: props.availableParentParameters,
  availableChildParameters: props.availableChildParameters
})

// UI state
const searchTerm = ref('')
const isGrouped = ref(true)
const sortBy = ref<'name' | 'category' | 'type' | 'fixed'>('category')
const isSaving = ref(false)

// Computed values
const activeColumns = computed(() => columnState.activeColumns.value)
const availableParameters = computed(() => columnState.availableParameters.value)
const hasHiddenColumns = computed(() => activeColumns.value.some((col) => !col.visible))

// Drag and drop handlers
const handleDragStart = (
  event: DragEvent,
  item: ColumnDef | ParameterDefinition,
  sourceList: 'active' | 'available'
) => {
  if (!event.dataTransfer) return

  const index = activeColumns.value.findIndex((col) => col.field === item.field)
  columnState.handleDragStart(item, sourceList, index)

  event.dataTransfer.setData(
    'application/json',
    JSON.stringify({
      item,
      sourceList,
      index
    })
  )
  event.dataTransfer.effectAllowed = 'move'
}

const handleReorder = (fromIndex: number, toIndex: number) => {
  console.log('Handling reorder:', { fromIndex, toIndex })
  columnState.handleReorder(fromIndex, toIndex)
}

const handleDrop = async (event: DragEvent) => {
  if (!event.dataTransfer) return
  event.preventDefault()

  const jsonData = event.dataTransfer.getData('application/json')
  if (!jsonData) return

  try {
    const dragData = JSON.parse(jsonData)
    console.log('Drop received:', dragData)

    if (dragData.sourceList === 'active') {
      // Handle reordering
      const sourceIndex = dragData.index
      const targetIndex = parseInt(
        event.currentTarget?.getAttribute('data-index') || '0',
        10
      )
      handleReorder(sourceIndex, targetIndex)
    } else {
      // Handle adding from available
      columnState.handleDrop(event)
    }
  } catch (error) {
    console.error('Error processing drop:', error)
  }
}

const handleDropToAvailable = (event: DragEvent) => {
  if (!event.dataTransfer) return
  event.preventDefault()
  columnState.handleDropToAvailable()
}

// Column operations
const handleVisibilityChange = (column: ColumnDef, visible: boolean) => {
  const updatedColumn = { ...column, visible }
  const updatedColumns = activeColumns.value.map((col) =>
    col.field === column.field ? updatedColumn : col
  )
  columnState.handleVisibilityChange(column, visible)
}

const showAllColumns = () => {
  const updatedColumns = activeColumns.value.map((col) => ({
    ...col,
    visible: true
  }))
  columnState.updateColumns(updatedColumns)
}

// Save and Cancel handlers
const handleApply = async () => {
  isSaving.value = true
  try {
    console.log('Saving state:', {
      parent: columnState.parentColumns.value,
      child: columnState.childColumns.value
    })

    await columnState.saveChanges()

    const updates = {
      parentColumns: columnState.parentColumns.value,
      childColumns: columnState.childColumns.value
    }

    console.log('Emitting updates:', updates)
    emit('update:columns', updates)
    emit('update:open', false)
  } catch (error) {
    console.error('Failed to save column changes:', error)
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
  emit('update:open', false)
}

// Debug watchers
watch(
  () => props.availableParentParameters,
  (params) => {
    console.group('📊 Column Manager Parameters Debug')
    console.log('Available Parent Parameters:', {
      count: params.length,
      fields: params.map((p) => p.field),
      categories: [...new Set(params.map((p) => p.category))]
    })
    console.groupEnd()
  },
  { immediate: true }
)

watch(
  () => columnState.currentView.value,
  (newView) => {
    console.log('View changed in component:', {
      view: newView,
      activeColumns: columnState.activeColumns.value,
      availableParameters: columnState.availableParameters.value
    })
  },
  { immediate: true }
)

watch(
  () => columnState.isDirty.value,
  (isDirty) => {
    console.log('Dirty state changed:', isDirty)
  }
)

watch(
  () => props.availableParentParameters,
  (params, old) => {
    console.group('Column Manager Parameters Update')
    console.log('New Parameters:', {
      count: params?.length,
      categories: [...new Set(params?.map((p) => p.category || 'Other'))]
    })
    console.log('Sample Parameters:', params?.slice(0, 3))
    console.groupEnd()
  },
  { immediate: true, deep: true }
)
</script>
