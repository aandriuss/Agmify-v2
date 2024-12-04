<template>
  <div class="flex-1 border rounded flex flex-col" @dragover.prevent>
    <!-- Header -->
    <div class="p-3 border-b bg-gray-50 flex items-center justify-between">
      <h3 class="font-medium text-sm">Active Columns</h3>
      <div class="flex items-center gap-2 text-sm">
        <span class="text-gray-500">
          {{ visibleColumnsCount }}/{{ totalColumnsCount }} visible
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

    <!-- Main Content -->
    <div
      class="flex-1 flex flex-col overflow-hidden"
      :class="{ 'opacity-50': isUpdating }"
    >
      <EnhancedColumnList
        :items="columns"
        mode="active"
        @remove="handleRemove"
        @visibility-change="handleVisibilityChange"
        @update:items="handleReorder"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import type { ColumnDef } from '~/composables/core/types'
import EnhancedColumnList from '../shared/EnhancedColumnList.vue'

const props = withDefaults(
  defineProps<{
    columns: ColumnDef[]
  }>(),
  {
    columns: () => []
  }
)

const emit = defineEmits<{
  'update:columns': [columns: ColumnDef[]]
  remove: [column: ColumnDef]
  'visibility-change': [column: ColumnDef, visible: boolean]
  reorder: [fromIndex: number, toIndex: number]
}>()

const isUpdating = ref(false)

// Computed properties
const totalColumnsCount = computed(() => props.columns?.length || 0)

const visibleColumnsCount = computed(
  () => props.columns?.filter((col) => col.visible).length || 0
)

const hasHiddenColumns = computed(
  () => visibleColumnsCount.value < totalColumnsCount.value
)

// Methods
const handleRemove = (column: ColumnDef) => {
  emit('remove', column)
}

const handleVisibilityChange = (column: ColumnDef, visible: boolean) => {
  emit('visibility-change', column, visible)
}

const handleReorderColumns = (fromIndex: number, toIndex: number) => {
  emit('reorder', fromIndex, toIndex)
}

const handleDragStart = (event: DragEvent, column: ColumnDef, index: number) => {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', JSON.stringify({ column, index }))
  }
}

const handleDragEnter = (index: number) => {
  // Handle drag enter logic if needed
}

const handleDrop = (event: DragEvent, index: number) => {
  const data = event.dataTransfer?.getData('text/plain')
  if (!data) return

  const { index: fromIndex } = JSON.parse(data)
  if (fromIndex !== index) {
    handleReorderColumns(fromIndex, index)
  }
}

const showAllColumns = () => {
  const updatedColumns = props.columns.map((col) => ({
    ...col,
    visible: true
  }))
  emit('update:columns', updatedColumns)
}
</script>

<style scoped>
.opacity-50 {
  pointer-events: none;
}
</style>
