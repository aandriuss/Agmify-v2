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
          <div class="p-1 border-b bg-gray-50 flex items-center">
            <h3 class="font-medium text-sm">Available Parameters</h3>
          </div>

          <div class="flex-1 min-h-0">
            <EnhancedColumnList
              :key="'available-${columnState.currentView.value}'"
              :items="availableParameters"
              mode="available"
              :search-term="searchTerm"
              :is-grouped="isGrouped"
              :sort-by="sortBy"
              @update:search-term="searchTerm = $event"
              @update:is-grouped="isGrouped = $event"
              @update:sort-by="sortBy = $event"
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
import { ref, computed } from 'vue'
import { LayoutDialog } from '@speckle/ui-components'
import Button from 'primevue/button'

import { useColumnState } from '../../../../../composables/useColumnState'
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

const handleDrop = async (event: DragEvent) => {
  if (!event.dataTransfer) return
  event.preventDefault()

  const jsonData = event.dataTransfer.getData('application/json')
  if (!jsonData) return

  try {
    const { index: targetIndex } = JSON.parse(jsonData)
    columnState.handleDrop(targetIndex)
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

// Save/Cancel handlers
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
    console.error('Failed to save column changes:', error)
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
  emit('update:open', false)
}
</script>
