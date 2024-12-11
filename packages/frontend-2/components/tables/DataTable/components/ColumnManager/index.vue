<template>
  <LayoutDialog
    :open="open"
    :max-width="'lg'"
    :hide-closer="false"
    mode="out-in"
    :title="tableName"
    :buttons="dialogButtons"
    @update:open="$emit('update:open', $event)"
  >
    <div class="flex flex-col gap-2">
      <!-- View selector -->
      <TabSelector :model-value="currentView" @update:model-value="handleViewChange" />

      <!-- Lists container -->
      <div class="flex gap-1 h-[400px]">
        <!-- Available Parameters Panel -->
        <div class="flex-1 border rounded flex flex-col overflow-hidden bg-background">
          <div class="p-1 border-b bg-gray-50 flex items-center justify-between">
            <h3 class="font-medium text-sm">Available Parameters</h3>
            <FormButton
              text
              size="sm"
              color="subtle"
              :icon-right="showFilterOptions ? ChevronUpIcon : ChevronDownIcon"
              @click="toggleFilterOptions"
            >
              Filter Options
            </FormButton>
          </div>

          <ColumnList
            :key="`available-${currentView}-${listRefreshKey}`"
            :items="availableColumns"
            mode="available"
            :show-filter-options="showFilterOptions"
            :search-term="searchTerm"
            :is-grouped="isGrouped"
            :sort-by="sortBy"
            :drop-position="dropPosition"
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
        <div class="flex-1 border rounded flex flex-col overflow-hidden bg-background">
          <div class="p-1 border-b bg-gray-50 flex items-center justify-between">
            <h3 class="font-medium text-sm">Active Columns</h3>
            <div class="flex items-center gap-1 text-sm">
              <span v-if="activeColumns.length" class="text-gray-500">
                {{ activeColumns.filter((col) => col?.visible).length }}/{{
                  activeColumns.length
                }}
                visible
              </span>
              <Button
                v-if="hasHiddenColumns"
                type="button"
                class="p-1 text-gray-500 hover:text-primary-focus"
                @click="showAllColumns"
              >
                Show All
              </Button>
            </div>
          </div>

          <ColumnList
            :key="`active-${currentView}-${listRefreshKey}`"
            :items="activeColumns"
            mode="active"
            :show-filter-options="false"
            :drop-position="dropPosition"
            @add="handleAdd"
            @remove="handleRemove"
            @drag-start="handleDragStart"
            @drag-end="handleDragEnd"
            @drag-enter="handleDragEnter"
            @drop="handleDrop"
            @visibility-change="handleVisibilityChange"
          />
        </div>
      </div>
    </div>
  </LayoutDialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/vue/24/solid'
import Button from 'primevue/button'
import TabSelector from './TabSelector.vue'
import ColumnList from './ColumnList.vue'
import type { ColumnDef } from '../../types'
import type { LayoutDialogButton } from '@speckle/ui-components'

interface Props {
  open: boolean
  tableId: string
  tableName: string
  columns: ColumnDef[]
  detailColumns?: ColumnDef[]
}

const props = withDefaults(defineProps<Props>(), {
  detailColumns: () => []
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:columns': [updates: { parentColumns: ColumnDef[]; childColumns: ColumnDef[] }]
  cancel: []
  apply: []
}>()

// State
const currentView = ref<'parent' | 'child'>('parent')
const showFilterOptions = ref(false)
const searchTerm = ref('')
const isGrouped = ref(true)
const sortBy = ref<'name' | 'category' | 'type'>('category')
const listRefreshKey = ref(0)
const dropPosition = ref<'above' | 'below' | null>(null)

// Local column state
const localColumns = ref<ColumnDef[]>([...props.columns])
const localDetailColumns = ref<ColumnDef[]>([...(props.detailColumns || [])])

// Computed
const activeColumns = computed(() => {
  return currentView.value === 'parent' ? localColumns.value : localDetailColumns.value
})

const availableColumns = computed(() => {
  const allColumns =
    currentView.value === 'parent' ? props.columns : props.detailColumns || []
  const activeIds = new Set(activeColumns.value.map((col) => col.id))
  return allColumns.filter((col) => !activeIds.has(col.id))
})

const hasHiddenColumns = computed(() => {
  return activeColumns.value.some((col) => !col.visible)
})

const dialogButtons = computed<LayoutDialogButton[]>(() => [
  {
    text: 'Apply',
    props: {
      submit: false,
      link: false,
      color: 'primary'
    },
    onClick: handleApply
  },
  {
    text: 'Cancel',
    props: {
      submit: false,
      link: false,
      color: 'outline'
    },
    onClick: handleCancel
  }
])

// Event Handlers
function handleViewChange(view: 'parent' | 'child'): void {
  currentView.value = view
  listRefreshKey.value++
}

function toggleFilterOptions(): void {
  showFilterOptions.value = !showFilterOptions.value
}

function handleSearchUpdate(value: string): void {
  searchTerm.value = value
}

function handleGroupingUpdate(value: boolean): void {
  isGrouped.value = value
}

function handleSortUpdate(value: 'name' | 'category' | 'type'): void {
  sortBy.value = value
}

function handleAdd(column: ColumnDef): void {
  const target = currentView.value === 'parent' ? localColumns : localDetailColumns
  target.value.push({ ...column })
  listRefreshKey.value++
}

function handleRemove(column: ColumnDef): void {
  const target = currentView.value === 'parent' ? localColumns : localDetailColumns
  const index = target.value.findIndex((col) => col.id === column.id)
  if (index !== -1) {
    target.value.splice(index, 1)
    listRefreshKey.value++
  }
}

function handleVisibilityChange(column: ColumnDef, visible: boolean): void {
  const target = currentView.value === 'parent' ? localColumns : localDetailColumns
  const index = target.value.findIndex((col) => col.id === column.id)
  if (index !== -1) {
    target.value[index] = { ...target.value[index], visible }
  }
}

function handleDragStart(event: DragEvent, column: ColumnDef): void {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', column.id)
  }
}

function handleDragEnd(): void {
  dropPosition.value = null
}

function handleDragEnter(event: DragEvent): void {
  const target = event.currentTarget as HTMLElement
  if (!target) return

  const rect = target.getBoundingClientRect()
  const mouseY = event.clientY
  const threshold = rect.top + rect.height / 2

  dropPosition.value = mouseY < threshold ? 'above' : 'below'
}

function handleDrop(event: DragEvent): void {
  event.preventDefault()
  dropPosition.value = null
}

function showAllColumns(): void {
  const target = currentView.value === 'parent' ? localColumns : localDetailColumns
  target.value = target.value.map((col) => ({ ...col, visible: true }))
}

function handleApply(): void {
  emit('update:columns', {
    parentColumns: localColumns.value,
    childColumns: localDetailColumns.value
  })
  emit('apply')
  emit('update:open', false)
}

function handleCancel(): void {
  localColumns.value = [...props.columns]
  localDetailColumns.value = [...(props.detailColumns || [])]
  emit('cancel')
  emit('update:open', false)
}
</script>

<style scoped>
.bg-background {
  background-color: white;
}
</style>
