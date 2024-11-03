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
        :columns="columns"
        mode="active"
        @remove="handleRemove"
        @visibility-change="handleVisibilityChange"
        @update:columns="handleColumnsUpdate"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import type { ColumnDef } from '../../../composables/types'
import EnhancedColumnList from '../EnhancedColumnList.vue'

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
}>()

// State
const isUpdating = ref(false)

// Computed with safety checks
const totalColumnsCount = computed(() => props.columns?.length || 0)

const visibleColumnsCount = computed(
  () => (props.columns || []).filter((col) => col.visible).length
)

const hasHiddenColumns = computed(
  () =>
    visibleColumnsCount.value < totalColumnsCount.value && totalColumnsCount.value > 0
)

// Methods
const updateColumns = async (newColumns: ColumnDef[]) => {
  try {
    isUpdating.value = true
    emit('update:columns', newColumns)
  } finally {
    setTimeout(() => {
      isUpdating.value = false
    }, 300)
  }
}

const handleColumnsUpdate = async (newColumns: ColumnDef[]) => {
  await updateColumns(newColumns || [])
}

const handleRemove = async (column: ColumnDef) => {
  if (!column.removable) return

  const updatedColumns = (props.columns || []).filter(
    (col) => col.field !== column.field
  )
  await updateColumns(updatedColumns)
}

const handleVisibilityChange = async (column: ColumnDef, visible: boolean) => {
  const updatedColumns = (props.columns || []).map((col) => {
    if (col.field === column.field) {
      return { ...col, visible }
    }
    return col
  })

  await updateColumns(updatedColumns)
}

const showAllColumns = async () => {
  const updatedColumns = (props.columns || []).map((col) => ({
    ...col,
    visible: true
  }))

  await updateColumns(updatedColumns)
}
</script>

<style scoped>
.opacity-50 {
  pointer-events: none;
}
</style>
