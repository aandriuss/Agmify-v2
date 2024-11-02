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
        props: { color: 'default', link: false },
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
    <div class="flex flex-col gap-4">
      <TabSelector v-model="activeTab" />

      <div class="flex gap-4 h-[400px]">
        <AvailableColumns
          :parameters="currentAvailableParameters"
          :search-term="searchTerm"
          :is-grouped="isGrouped"
          :sort-by="sortBy"
          :active-columns="currentColumns"
          @update:search-term="searchTerm = $event"
          @update:is-grouped="isGrouped = $event"
          @update:sort-by="sortBy = $event"
          @add="handleAddColumn"
          @drag-start="handleDragStart"
        />

        <ActiveColumns
          :columns="currentColumns"
          @remove="handleRemoveColumn"
          @reorder="handleReorder"
          @visibility-change="handleVisibilityChange"
          @drag-start="handleDragStart"
          @drag-enter="handleDragEnter"
          @drop="handleDrop"
        />
      </div>
    </div>
  </LayoutDialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { LayoutDialog } from '@speckle/ui-components'
import TabSelector from './TabSelector.vue'
import AvailableColumns from './AvailableColumns/index.vue'
import ActiveColumns from './ActiveColumns/index.vue'
import { useColumnDragDrop } from '../../composables/useColumnDragDrop'
import type { ColumnDef, ParameterDefinition } from '../../composables/types'

const props = defineProps<{
  open: boolean
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  availableParentParameters: ParameterDefinition[]
  availableChildParameters: ParameterDefinition[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:columns': [updates: { parentColumns: ColumnDef[]; childColumns: ColumnDef[] }]
  cancel: []
}>()

// Local state
const activeTab = ref<'parent' | 'child'>('parent')
const searchTerm = ref('')
const isGrouped = ref(true)
const sortBy = ref<'name' | 'category' | 'type' | 'fixed'>('category')

// Computed values for current tab
const currentColumns = computed(() =>
  activeTab.value === 'parent' ? props.parentColumns : props.childColumns
)

const currentAvailableParameters = computed(() =>
  activeTab.value === 'parent'
    ? props.availableParentParameters
    : props.availableChildParameters
)

// Drag and drop functionality
const {
  dragOverIndex,
  draggedItem,
  handleDragStart,
  handleDragEnter,
  handleDropToActive,
  handleDropToAvailable,
  resetDragState
} = useColumnDragDrop()

// Event handlers
const handleAddColumn = (param: ParameterDefinition) => {
  const newColumn: ColumnDef = {
    field: param.field,
    header: param.header,
    visible: true,
    removable: true,
    order: currentColumns.value.length,
    isFixed: param.isFixed
  }

  if (activeTab.value === 'parent') {
    emit('update:columns', {
      parentColumns: [...props.parentColumns, newColumn],
      childColumns: props.childColumns
    })
  } else {
    emit('update:columns', {
      parentColumns: props.parentColumns,
      childColumns: [...props.childColumns, newColumn]
    })
  }
}

const handleRemoveColumn = (column: ColumnDef) => {
  if (!column.removable) return

  if (activeTab.value === 'parent') {
    const filtered = props.parentColumns.filter((col) => col.field !== column.field)
    emit('update:columns', {
      parentColumns: filtered,
      childColumns: props.childColumns
    })
  } else {
    const filtered = props.childColumns.filter((col) => col.field !== column.field)
    emit('update:columns', {
      parentColumns: props.parentColumns,
      childColumns: filtered
    })
  }
}

const handleVisibilityChange = (column: ColumnDef, visible: boolean) => {
  const updatedColumn = { ...column, visible }

  if (activeTab.value === 'parent') {
    const updated = props.parentColumns.map((col) =>
      col.field === column.field ? updatedColumn : col
    )
    emit('update:columns', {
      parentColumns: updated,
      childColumns: props.childColumns
    })
  } else {
    const updated = props.childColumns.map((col) =>
      col.field === column.field ? updatedColumn : col
    )
    emit('update:columns', {
      parentColumns: props.parentColumns,
      childColumns: updated
    })
  }
}

const handleReorder = (fromIndex: number, toIndex: number) => {
  const columns = [...currentColumns.value]
  const [movedColumn] = columns.splice(fromIndex, 1)
  columns.splice(toIndex, 0, movedColumn)

  // Update order property
  columns.forEach((col, index) => {
    col.order = index
  })

  if (activeTab.value === 'parent') {
    emit('update:columns', {
      parentColumns: columns,
      childColumns: props.childColumns
    })
  } else {
    emit('update:columns', {
      parentColumns: props.parentColumns,
      childColumns: columns
    })
  }
}

const handleDrop = (event: DragEvent) => {
  handleDropToActive(event, currentColumns.value, handleAddColumn, handleReorder)
}

const handleApply = () => {
  emit('update:open', false)
}

const handleCancel = () => {
  resetDragState()
  emit('cancel')
  emit('update:open', false)
}
</script>
