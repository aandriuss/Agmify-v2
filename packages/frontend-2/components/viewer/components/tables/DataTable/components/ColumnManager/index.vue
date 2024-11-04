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
    <div class="flex flex-col gap-4">
      <TabSelector v-model="activeTab" />

      <div class="flex gap-4 h-[400px]">
        <!-- Available Parameters Panel -->
        <div class="flex-1 border rounded flex flex-col overflow-hidden bg-background">
          <div class="p-3 border-b bg-gray-50 flex items-center">
            <h3 class="font-medium text-sm">Available Parameters</h3>
          </div>

          <div class="flex-1 min-h-0">
            <EnhancedColumnList
              :items="availableParameters"
              mode="available"
              :search-term="searchTerm"
              :is-grouped="isGrouped"
              :sort-by="sortBy"
              @update:search-term="searchTerm = $event"
              @update:is-grouped="isGrouped = $event"
              @update:sort-by="sortBy = $event"
              @add="handleAddColumn"
              @drag-start="handleDragStart"
              @drop="handleDropToAvailable"
            />
          </div>
        </div>

        <!-- Active Columns Panel -->
        <div class="flex-1 border rounded flex flex-col overflow-hidden bg-background">
          <div class="p-3 border-b bg-gray-50 flex items-center justify-between">
            <h3 class="font-medium text-sm">Active Columns</h3>
            <div class="flex items-center gap-2 text-sm">
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
              :items="activeColumns"
              mode="active"
              @remove="handleRemoveColumn"
              @reorder="handleReorder"
              @visibility-change="handleVisibilityChange"
              @drag-start="handleDragStart"
              @drop="handleDrop"
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
import TabSelector from './TabSelector.vue'
import EnhancedColumnList from './shared/EnhancedColumnList.vue'
import type { ColumnDef, ParameterDefinition } from '../../composables/types'
import { useUserSettings } from '~/composables/useUserSettings'

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

interface NamedTableConfig {
  id: string
  name: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  categoryFilters?: {
    selectedParentCategories: string[]
    selectedChildCategories: string[]
  }
}

interface UserSettings {
  namedTables: Record<string, NamedTableConfig>
}

// Use settings management
const {
  settings,
  loading: settingsLoading,
  saveSettings,
  loadSettings,
  updateNamedTable,
  createNamedTable
} = useUserSettings()

// Add more reactive state
const localSettings = ref<UserSettings | null>(null)
// Local state
const activeTab = ref<'parent' | 'child'>('parent')
const searchTerm = ref('')
const isGrouped = ref(true)
const sortBy = ref<'name' | 'category' | 'type' | 'fixed'>('category')
const isSaving = ref(false)

// Local column state
const localParentColumns = ref<ColumnDef[]>([])
const localChildColumns = ref<ColumnDef[]>([])

// Initialize local state when props change
watch(
  () => props.parentColumns,
  (newCols) => {
    localParentColumns.value = [...newCols]
  },
  { immediate: true }
)

watch(
  () => props.childColumns,
  (newCols) => {
    localChildColumns.value = [...newCols]
  },
  { immediate: true }
)

// Computed values
const activeColumns = computed(() =>
  activeTab.value === 'parent' ? localParentColumns.value : localChildColumns.value
)

const availableParameters = computed(() => {
  const allParams =
    activeTab.value === 'parent'
      ? props.availableParentParameters
      : props.availableChildParameters

  const activeFields = activeColumns.value.map((col) => col.field)
  return allParams.filter((param) => !activeFields.includes(param.field))
})

const hasHiddenColumns = computed(() => {
  return activeColumns.value.some((col) => !col.visible)
})

// Column management methods
const handleAddColumn = (param: ParameterDefinition) => {
  const newColumn: ColumnDef = {
    ...param,
    visible: true,
    order: activeColumns.value.length,
    removable: true
  }

  if (activeTab.value === 'parent') {
    localParentColumns.value = [...localParentColumns.value, newColumn].map(
      (col, index) => ({
        ...col,
        order: index
      })
    )
  } else {
    localChildColumns.value = [...localChildColumns.value, newColumn].map(
      (col, index) => ({
        ...col,
        order: index
      })
    )
  }
}

const handleRemoveColumn = (column: ColumnDef) => {
  if (!column.removable) return

  if (activeTab.value === 'parent') {
    localParentColumns.value = localParentColumns.value
      .filter((col) => col.field !== column.field)
      .map((col, index) => ({
        ...col,
        order: index
      }))
  } else {
    localChildColumns.value = localChildColumns.value
      .filter((col) => col.field !== column.field)
      .map((col, index) => ({
        ...col,
        order: index
      }))
  }
}

const handleReorder = (fromIndex: number, toIndex: number) => {
  // Create deep copies of the columns to avoid mutating frozen objects
  const columns = activeColumns.value.map((col) => ({ ...col }))
  const [movedColumn] = columns.splice(fromIndex, 1)
  columns.splice(toIndex, 0, movedColumn)

  // Update order values on the copies
  columns.forEach((col, index) => {
    col.order = index
  })

  // Assign the modified array to the appropriate ref
  if (activeTab.value === 'parent') {
    localParentColumns.value = columns
  } else {
    localChildColumns.value = columns
  }
}

const handleVisibilityChange = (column: ColumnDef, visible: boolean) => {
  if (activeTab.value === 'parent') {
    localParentColumns.value = localParentColumns.value.map((col) =>
      col.field === column.field ? { ...col, visible } : col
    )
  } else {
    localChildColumns.value = localChildColumns.value.map((col) =>
      col.field === column.field ? { ...col, visible } : col
    )
  }
}

const showAllColumns = () => {
  if (activeTab.value === 'parent') {
    localParentColumns.value = localParentColumns.value.map((col) => ({
      ...col,
      visible: true
    }))
  } else {
    localChildColumns.value = localChildColumns.value.map((col) => ({
      ...col,
      visible: true
    }))
  }
}

// Drag and drop handlers
const handleDragStart = (event: DragEvent, item: ColumnDef | ParameterDefinition) => {
  if (!event.dataTransfer) return
  event.dataTransfer.effectAllowed = 'move'
  const itemData = JSON.stringify(item)
  event.dataTransfer.setData('application/json', itemData)
  console.log('Drag started with item:', item) // Debug
}

const handleDrop = async (event: DragEvent) => {
  console.log('Drop event triggered on active list') // New debug log
  event.preventDefault()
  event.stopPropagation()

  if (!event.dataTransfer) {
    console.log('No dataTransfer found') // Debug
    return
  }

  const data = event.dataTransfer.getData('application/json')
  if (!data) {
    console.log('No data found in transfer') // Debug
    return
  }

  try {
    const item = JSON.parse(data)
    console.log('Successfully parsed dropped item:', item) // Debug

    if ('type' in item) {
      console.log('Adding new column') // Debug
      // Adding from available parameters to active columns
      const newColumn: ColumnDef = {
        ...item,
        visible: true,
        order: activeColumns.value.length,
        removable: true
      }

      if (activeTab.value === 'parent') {
        localParentColumns.value = [...localParentColumns.value, newColumn].map(
          (col, index) => ({
            ...col,
            order: index
          })
        )
        console.log('Updated parent columns:', localParentColumns.value) // Debug
      } else {
        localChildColumns.value = [...localChildColumns.value, newColumn].map(
          (col, index) => ({
            ...col,
            order: index
          })
        )
        console.log('Updated child columns:', localChildColumns.value) // Debug
      }
    }
  } catch (error) {
    console.error('Error processing drop:', error)
  }
}

const handleDropToAvailable = (event: DragEvent) => {
  console.log('Drop event triggered on available list') // New debug log
  event.preventDefault()
  event.stopPropagation()

  if (!event.dataTransfer) {
    console.log('No dataTransfer found') // Debug
    return
  }

  const data = event.dataTransfer.getData('application/json')
  if (!data) {
    console.log('No data found in transfer') // Debug
    return
  }

  try {
    const item = JSON.parse(data)
    console.log('Successfully parsed dropped item:', item) // Debug

    if (!('type' in item) && item.removable) {
      console.log('Removing column') // Debug
      if (activeTab.value === 'parent') {
        localParentColumns.value = localParentColumns.value
          .filter((col) => col.field !== item.field)
          .map((col, index) => ({
            ...col,
            order: index
          }))
        console.log('Updated parent columns:', localParentColumns.value) // Debug
      } else {
        localChildColumns.value = localChildColumns.value
          .filter((col) => col.field !== item.field)
          .map((col, index) => ({
            ...col,
            order: index
          }))
        console.log('Updated child columns:', localChildColumns.value) // Debug
      }
    }
  } catch (error) {
    console.error('Error processing drop:', error)
  }
}

const handleApply = async () => {
  try {
    isSaving.value = true

    const tableConfig: NamedTableConfig = {
      id: props.tableId,
      name: settings.value?.namedTables?.[props.tableId]?.name || 'New Table',
      parentColumns: localParentColumns.value,
      childColumns: localChildColumns.value,
      categoryFilters: settings.value?.namedTables?.[props.tableId]
        ?.categoryFilters || {
        selectedParentCategories: [],
        selectedChildCategories: []
      }
    }

    if (!settings.value?.namedTables?.[props.tableId]) {
      // Create new table if it doesn't exist
      await createNamedTable(props.tableId, tableConfig)
    } else {
      // Update existing table
      await updateNamedTable(props.tableId, tableConfig)
    }

    // Update local state and emit changes
    emit('update:columns', {
      parentColumns: localParentColumns.value,
      childColumns: localChildColumns.value
    })

    emit('update:open', false)
  } catch (error) {
    console.error('Failed to save column settings:', error)
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => {
  // Reset to original state
  localParentColumns.value = [...props.parentColumns]
  localChildColumns.value = [...props.childColumns]
  emit('cancel')
  emit('update:open', false)
}

// Load initial settings
onMounted(async () => {
  try {
    await loadSettings()

    const currentTable = settings.value?.namedTables?.[props.tableId]
    if (currentTable) {
      // Initialize with saved settings if they exist
      localParentColumns.value = currentTable.parentColumns || []
      localChildColumns.value = currentTable.childColumns || []
    } else {
      // Initialize with props if no saved settings
      localParentColumns.value = [...props.parentColumns]
      localChildColumns.value = [...props.childColumns]
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
    // Fall back to props
    localParentColumns.value = [...props.parentColumns]
    localChildColumns.value = [...props.childColumns]
  }
})

watch(
  () => settings.value?.namedTables?.[props.tableId],
  (newTableSettings) => {
    if (newTableSettings) {
      // Update local columns only if they haven't been modified
      if (!localParentColumns.value.length) {
        localParentColumns.value = [...newTableSettings.parentColumns]
      }
      if (!localChildColumns.value.length) {
        localChildColumns.value = [...newTableSettings.childColumns]
      }
    }
  },
  { immediate: true, deep: true }
)

onBeforeUnmount(() => {
  // Clean up any subscriptions or state if needed
  localSettings.value = null
})
</script>
