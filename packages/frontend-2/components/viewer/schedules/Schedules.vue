<template>
  <div>
    <ViewerLayoutPanel :initial-width="400" @close="$emit('close')">
      <template #title>Elements Schedule</template>
      <template #actions>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-2 flex-1">
            <!-- Table Selection Dropdown -->
            <label class="text-sm">Select Table:</label>
            <select
              v-model="state.selectedTableId"
              class="px-2 py-1 rounded border bg-background text-sm h-8 min-w-[150px]"
              @change="handleTableChange"
            >
              <option value="">Create New Table</option>
              <option v-for="table in tablesArray" :key="table.id" :value="table.id">
                {{ table.name }}
              </option>
            </select>

            <input
              v-model="state.tableName"
              type="text"
              class="flex-1 px-2 py-1 rounded border bg-background text-sm h-8"
              placeholder="Enter table name"
            />

            <FormButton
              text
              size="sm"
              color="primary"
              :disabled="!state.tableName"
              @click="saveTable"
            >
              {{ state.selectedTableId ? 'Update' : 'Save New' }}
            </FormButton>
          </div>

          <!-- Category Filter Button -->
          <FormButton
            text
            size="sm"
            color="subtle"
            :icon-right="state.showCategoryOptions ? ChevronUpIcon : ChevronDownIcon"
            @click="state.showCategoryOptions = !state.showCategoryOptions"
          >
            Category filter options
          </FormButton>
        </div>
      </template>

      <div class="flex flex-col">
        <!-- Category Options Section -->
        <div
          v-show="state.showCategoryOptions"
          class="sticky top-10 px-2 py-2 border-b-2 border-primary-muted bg-foundation"
        >
          <div class="flex flex-row justify-between">
            <!-- Parent Categories -->
            <div class="flex-1 mr-4">
              <span class="text-body-xs text-foreground font-medium mb-2 block">
                Host Categories
              </span>
              <div class="max-h-[200px] overflow-y-auto">
                <div v-for="category in parentCategories" :key="category">
                  <FormButton
                    size="sm"
                    :icon-left="
                      selectedParentCategories.includes(category)
                        ? CheckCircleIcon
                        : CheckCircleIconOutlined
                    "
                    text
                    @click="toggleParentCategory(category)"
                  >
                    {{ category }}
                  </FormButton>
                </div>
              </div>
            </div>

            <!-- Child Categories -->
            <div class="flex-1">
              <span class="text-body-xs text-foreground font-medium mb-2 block">
                Child Categories
              </span>
              <div class="max-h-[200px] overflow-y-auto">
                <div v-for="category in childCategories" :key="category">
                  <FormButton
                    size="sm"
                    :icon-left="
                      selectedChildCategories.includes(category)
                        ? CheckCircleIcon
                        : CheckCircleIconOutlined
                    "
                    text
                    @click="toggleChildCategory(category)"
                  >
                    {{ category }}
                  </FormButton>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Table Section -->
        <DataTable
          v-if="shouldRenderTable"
          :key="state.tableKey"
          v-model:expanded-rows="state.expandedRows"
          :table-id="currentTableId"
          :data="scheduleData || []"
          :columns="currentTableColumns"
          :detail-columns="currentDetailColumns"
          :available-parent-parameters="availableHeaders.parent"
          :available-child-parameters="availableHeaders.child"
          :expand-button-aria-label="'Expand row'"
          :collapse-button-aria-label="'Collapse row'"
          data-key="id"
          @update:columns="handleParentColumnsUpdate"
          @update:detail-columns="handleChildColumnsUpdate"
          @update:both-columns="handleBothColumnsUpdate"
          @column-reorder="handleColumnReorder"
        />
      </div>
    </ViewerLayoutPanel>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, reactive } from 'vue'
import { useUserSettings } from '~/composables/useUserSettings'
import { useElementsData } from '~/composables/useElementsData'
import DataTable from '~/components/viewer/tables/DataTable.vue'
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/vue/24/solid'
import { CheckCircleIcon as CheckCircleIconOutlined } from '@heroicons/vue/24/outline'

import {
  standardParameters,
  extractParametersFromData,
  mergeParameters,
  type ParameterDefinition
} from './parameterDefinitions'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:columns', columns: any[]): void
  (e: 'update:detail-columns', columns: any[]): void
  (
    e: 'update:both-columns',
    updates: { parentColumns: any[]; childColumns: any[] }
  ): void
  (
    e: 'onUpdate:both-columns',
    updates: { parentColumns: any[]; childColumns: any[] }
  ): void
  (e: 'column-reorder', event: any): void
}>()

const DEFAULT_TABLE_ID = 'elements-schedule'
const {
  settings,
  loading,
  saveSettings,
  loadSettings,
  createNamedTable,
  updateNamedTable
} = useUserSettings()

// UI State
const state = reactive({
  tableName: '',
  showCategoryOptions: false,
  expandedRows: [],
  selectedTableId: null as string | null,
  tableKey: Date.now().toString()
})

// Categories
const parentCategories = ['Walls', 'Floors', 'Roofs']
const childCategories = [
  'Structural Framing',
  'Structural Connections',
  'Windows',
  'Doors',
  'Ducts',
  'Pipes',
  'Cable Trays',
  'Conduits',
  'Lighting Fixtures'
]

// Category selections
const selectedParentCategories = ref<string[]>([])
const selectedChildCategories = ref<string[]>([])

// Computed property for tables array
const tablesArray = computed(() => {
  const tables = settings.value?.namedTables || {}
  return Object.entries(tables).map(([id, table]) => ({
    id,
    name: table.name
  }))
})

// Get current table ID (either selected or default)
const currentTableId = computed(() => state.selectedTableId || DEFAULT_TABLE_ID)

// Default column configurations
const defaultParentColumns = [
  { field: 'category', header: 'Category', visible: true, removable: false, order: 0 },
  { field: 'id', header: 'ID', visible: true, removable: true, order: 1 },
  { field: 'mark', header: 'Mark', visible: true, removable: true, order: 2 },
  { field: 'host', header: 'Host', visible: true, removable: true, order: 3 },
  { field: 'comment', header: 'Comment', visible: true, removable: true, order: 4 }
]

const defaultChildColumns = [
  { field: 'category', header: 'Category', visible: true, removable: false, order: 0 },
  { field: 'id', header: 'ID', visible: true, removable: true, order: 1 },
  { field: 'mark', header: 'Mark', visible: true, removable: true, order: 2 },
  { field: 'host', header: 'Host', visible: true, removable: true, order: 3 },
  { field: 'comment', header: 'Comment', visible: true, removable: true, order: 4 }
]

const availableParentParameters = ref<ParameterDefinition[]>([])
const availableChildParameters = ref<ParameterDefinition[]>([])

const updateAvailableParameters = () => {
  if (!scheduleData.value?.length) return

  // Extract parameters from parent data
  const parentDataParams = extractParametersFromData(scheduleData.value)
  availableParentParameters.value = mergeParameters(
    standardParameters,
    parentDataParams
  )

  // Extract parameters from child data (if exists)
  const firstParentWithDetails = scheduleData.value.find((item) => item.details?.length)
  if (firstParentWithDetails?.details?.length) {
    const childDataParams = extractParametersFromData(firstParentWithDetails.details)
    availableChildParameters.value = mergeParameters(
      standardParameters,
      childDataParams
    )
  }
}

// Current columns computed properties
const currentTableColumns = computed(() => {
  const currentTable = settings.value?.namedTables?.[currentTableId.value]
  const columns =
    currentTable?.parentColumns?.length > 0
      ? [...currentTable.parentColumns].sort((a, b) => a.order - b.order)
      : defaultParentColumns

  // Force reactivity by creating new array
  return [...columns]
})

const currentDetailColumns = computed(() => {
  const currentTable = settings.value?.namedTables?.[currentTableId.value]
  const columns =
    currentTable?.childColumns?.length > 0
      ? [...currentTable.childColumns].sort((a, b) => a.order - b.order)
      : defaultChildColumns

  // Force reactivity by creating new array
  return [...columns]
})

// Get schedule data
const { scheduleData, updateCategories, availableHeaders, rootNodes } = useElementsData(
  {
    currentTableColumns,
    currentDetailColumns
  }
)

// Handle table selection change
const handleTableChange = async () => {
  if (state.selectedTableId) {
    const selectedTable = settings.value?.namedTables?.[state.selectedTableId]
    if (selectedTable) {
      state.tableName = selectedTable.name

      // Update categories
      selectedParentCategories.value =
        selectedTable.categoryFilters?.selectedParentCategories || []
      selectedChildCategories.value =
        selectedTable.categoryFilters?.selectedChildCategories || []

      // Update columns with previously selected parameters
      if (selectedTable.parentColumns) {
        const updatedParentColumns = mergeColumnDefinitions(
          availableHeaders.value.parent,
          selectedTable.parentColumns
        )
        await handleParentColumnsUpdate(updatedParentColumns)
      }

      if (selectedTable.childColumns) {
        const updatedChildColumns = mergeColumnDefinitions(
          availableHeaders.value.child,
          selectedTable.childColumns
        )
        await handleChildColumnsUpdate(updatedChildColumns)
      }

      // Update data with new parameters
      updateCategories(selectedParentCategories.value, selectedChildCategories.value)
      state.tableKey = Date.now().toString()
    }
  }
}

function mergeColumnDefinitions(
  available: ParameterDefinition[],
  saved: ColumnDefinition[]
): ColumnDefinition[] {
  return saved.map((savedCol) => {
    const availableParam = available.find((p) => p.field === savedCol.field)
    if (availableParam) {
      return {
        ...savedCol,
        header: availableParam.header,
        category: availableParam.category,
        type: availableParam.type
      }
    }
    return savedCol
  })
}

// Save table handler
const saveTable = async () => {
  if (!state.tableName) return

  try {
    console.log('Starting table save...')

    if (state.selectedTableId) {
      // Update existing table
      console.log('Updating existing table:', state.selectedTableId)

      const currentTable = settings.value?.namedTables?.[state.selectedTableId]
      if (!currentTable) {
        throw new Error('Table not found in current settings')
      }

      await updateNamedTable(state.selectedTableId, {
        name: state.tableName,
        parentColumns: currentTableColumns.value,
        childColumns: currentDetailColumns.value,
        categoryFilters: {
          selectedParentCategories: selectedParentCategories.value,
          selectedChildCategories: selectedChildCategories.value
        }
      })
    } else {
      // Create new table
      console.log('Creating new table:', state.tableName)

      // Create new table and get its ID
      const newTableId = await createNamedTable(state.tableName, {
        parentColumns: [...defaultParentColumns],
        childColumns: [...defaultChildColumns],
        categoryFilters: {
          selectedParentCategories: selectedParentCategories.value,
          selectedChildCategories: selectedChildCategories.value
        }
      })

      if (!newTableId) {
        throw new Error('Failed to get new table ID')
      }

      // Update selected table ID
      state.selectedTableId = newTableId
    }

    // Reload settings and verify save
    await loadSettings()

    // Verify the table exists in settings
    const savedTable = settings.value?.namedTables?.[state.selectedTableId]
    if (!savedTable) {
      throw new Error('Failed to verify table save')
    }

    console.log('Table saved successfully:', savedTable)

    // Update UI state
    state.tableName = savedTable.name
    selectedParentCategories.value =
      savedTable.categoryFilters?.selectedParentCategories || []
    selectedChildCategories.value =
      savedTable.categoryFilters?.selectedChildCategories || []
    updateCategories(selectedParentCategories.value, selectedChildCategories.value)

    // Refresh table
    state.tableKey = Date.now().toString()
  } catch (error) {
    console.error('Error saving table:', error)
    throw error
  }
}

// Column update handlers
const handleParentColumnsUpdate = async (newColumns) => {
  try {
    if (!newColumns?.length) return

    // Get current table config
    const currentTable = settings.value?.namedTables?.[currentTableId.value]
    if (!currentTable) return

    const columnsToSave = newColumns.map((col, index) => ({
      ...col,
      order: index,
      visible: col.visible ?? true,
      field: col.field,
      header: col.header,
      removable: col.removable ?? true
    }))

    // Update while preserving other table settings
    await updateNamedTable(currentTableId.value, {
      ...currentTable,
      parentColumns: columnsToSave,
      // Preserve other settings explicitly
      childColumns: currentTable.childColumns,
      name: currentTable.name,
      categoryFilters: currentTable.categoryFilters
    })

    // Force table refresh
    state.tableKey = Date.now().toString()
  } catch (error) {
    console.error('Failed to save parent columns:', error)
  }
}

const handleChildColumnsUpdate = async (newColumns) => {
  try {
    if (!newColumns?.length) return

    // Get current table config
    const currentTable = settings.value?.namedTables?.[currentTableId.value]
    if (!currentTable) return

    const columnsToSave = newColumns.map((col, index) => ({
      ...col,
      order: index,
      visible: col.visible ?? true,
      field: col.field,
      header: col.header,
      removable: col.removable ?? true
    }))

    // Update while preserving other table settings
    await updateNamedTable(currentTableId.value, {
      ...currentTable,
      childColumns: columnsToSave,
      // Preserve other settings explicitly
      parentColumns: currentTable.parentColumns,
      name: currentTable.name,
      categoryFilters: currentTable.categoryFilters
    })

    // Force table refresh
    state.tableKey = Date.now().toString()
  } catch (error) {
    console.error('Failed to save child columns:', error)
  }
}

const handleBothColumnsUpdate = async (updates: {
  parentColumns: any[]
  childColumns: any[]
}) => {
  try {
    const { parentColumns, childColumns } = updates
    console.log('Both columns updating:', { parentColumns, childColumns })

    // Get current table config
    const currentTable = settings.value?.namedTables?.[currentTableId.value]
    if (!currentTable) return

    const processedParentColumns = parentColumns.map((col, index) => ({
      ...col,
      order: index,
      visible: col.visible ?? true,
      field: col.field,
      header: col.header,
      removable: col.removable ?? true
    }))

    const processedChildColumns = childColumns.map((col, index) => ({
      ...col,
      order: index,
      visible: col.visible ?? true,
      field: col.field,
      header: col.header,
      removable: col.removable ?? true
    }))

    // Update table configuration
    await updateNamedTable(currentTableId.value, {
      ...currentTable,
      parentColumns: processedParentColumns,
      childColumns: processedChildColumns,
      name: currentTable.name,
      categoryFilters: currentTable.categoryFilters
    })

    // Important: Trigger data refresh with new columns
    updateCategories(selectedParentCategories.value, selectedChildCategories.value)

    // Force table refresh
    state.tableKey = Date.now().toString()

    console.log('Table updated with new columns, triggering data refresh')
  } catch (error) {
    console.error('Failed to update both column sets:', error)
  }
}

const handleColumnReorder = async (event) => {
  try {
    const dataTable = event.target.closest('.p-datatable')
    const isChildTable = dataTable.classList.contains('nested-table')

    // Get current table config
    const currentTable = settings.value?.namedTables?.[currentTableId.value]
    if (!currentTable) return

    const headers = Array.from(dataTable.querySelectorAll('th[data-field]'))
    const reorderedColumns = headers
      .map((header, index) => {
        const field = header.getAttribute('data-field')
        const sourceColumns = isChildTable
          ? currentTable.childColumns
          : currentTable.parentColumns
        const existingColumn = sourceColumns.find((col) => col.field === field)

        return existingColumn
          ? {
              ...existingColumn,
              order: index,
              visible: true,
              field,
              header: existingColumn.header,
              removable: existingColumn.removable ?? true
            }
          : null
      })
      .filter(Boolean)

    // Update while preserving other settings
    await updateNamedTable(currentTableId.value, {
      ...currentTable,
      [isChildTable ? 'childColumns' : 'parentColumns']: reorderedColumns,
      // Preserve the other type of columns
      [isChildTable ? 'parentColumns' : 'childColumns']: isChildTable
        ? currentTable.parentColumns
        : currentTable.childColumns,
      name: currentTable.name,
      categoryFilters: currentTable.categoryFilters
    })

    // Force table refresh
    state.tableKey = Date.now().toString()
  } catch (error) {
    console.error('Failed to save reordered columns:', error)
  }
}

const toggleParentCategory = async (category: string) => {
  try {
    const current = [...selectedParentCategories.value]
    const updated = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category]

    // Update local state first
    selectedParentCategories.value = updated
    updateCategories(updated, selectedChildCategories.value)

    if (state.selectedTableId) {
      // Changed from selectedTableId.value
      // Get the complete current table state
      const currentTable = settings.value?.namedTables?.[state.selectedTableId]

      // Preserve all existing table data while updating filters
      await updateNamedTable(state.selectedTableId, {
        ...currentTable,
        name: currentTable.name,
        parentColumns: currentTable.parentColumns,
        childColumns: currentTable.childColumns,
        categoryFilters: {
          selectedParentCategories: updated,
          selectedChildCategories: selectedChildCategories.value
        }
      })
    }
  } catch (error) {
    console.error('Error toggling parent category:', error)
    selectedParentCategories.value = [...selectedParentCategories.value]
    updateCategories(selectedParentCategories.value, selectedChildCategories.value)
  }
}

// Similarly update toggleChildCategory
const toggleChildCategory = async (category: string) => {
  try {
    const current = [...selectedChildCategories.value]
    const updated = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category]

    // Update local state first
    selectedChildCategories.value = updated
    updateCategories(selectedParentCategories.value, updated)

    if (state.selectedTableId) {
      // Changed from selectedTableId.value
      // Get the complete current table state
      const currentTable = settings.value?.namedTables?.[state.selectedTableId]

      // Preserve all existing table data while updating filters
      await updateNamedTable(selectedTableId.value, {
        ...currentTable,
        name: currentTable.name,
        parentColumns: currentTable.parentColumns,
        childColumns: currentTable.childColumns,
        categoryFilters: {
          selectedParentCategories: selectedParentCategories.value,
          selectedChildCategories: updated
        }
      })
    }
  } catch (error) {
    console.error('Error toggling child category:', error)
    // Revert local state on error
    selectedChildCategories.value = [...selectedChildCategories.value]
    updateCategories(selectedParentCategories.value, selectedChildCategories.value)
  }
}

const shouldRenderTable = computed(() => {
  return !!(currentTableColumns.value?.length && settings.value)
})

// Modified initialization
onMounted(async () => {
  await loadSettings()
  const currentSettings = settings.value

  // Only create default table if there are absolutely no tables
  if (
    !currentSettings?.namedTables ||
    Object.keys(currentSettings.namedTables).length === 0
  ) {
    console.log('No tables found, initializing default table...')

    const defaultTable = {
      id: DEFAULT_TABLE_ID,
      name: 'Default Table',
      parentColumns: defaultParentColumns,
      childColumns: defaultChildColumns,
      categoryFilters: {
        selectedParentCategories: [],
        selectedChildCategories: []
      }
    }

    // Create settings while preserving any existing data
    const updatedSettings = {
      ...currentSettings,
      namedTables: {
        ...(currentSettings?.namedTables || {}),
        [DEFAULT_TABLE_ID]: defaultTable
      }
    }

    await saveSettings(updatedSettings)
  }

  // Load settings again to ensure we have the latest data
  await loadSettings()

  // Set selected table to existing table or default
  const availableTables = settings.value?.namedTables || {}
  if (Object.keys(availableTables).length > 0) {
    // Prefer default table if it exists, otherwise take first available
    const tableToSelect = availableTables[DEFAULT_TABLE_ID]
      ? DEFAULT_TABLE_ID
      : Object.keys(availableTables)[0]

    state.selectedTableId = tableToSelect
    const selectedTable = availableTables[tableToSelect]

    if (selectedTable) {
      state.tableName = selectedTable.name
      selectedParentCategories.value =
        selectedTable.categoryFilters?.selectedParentCategories || []
      selectedChildCategories.value =
        selectedTable.categoryFilters?.selectedChildCategories || []
      updateCategories(selectedParentCategories.value, selectedChildCategories.value)
    }
  }
})

// Watch for settings changes from other clients
watch(
  () => settings.value?.namedTables?.[state.selectedTableId]?.categoryFilters,
  (newFilters) => {
    if (newFilters) {
      selectedParentCategories.value = newFilters.selectedParentCategories || []
      selectedChildCategories.value = newFilters.selectedChildCategories || []
      updateCategories(selectedParentCategories.value, selectedChildCategories.value)
    }
  },
  { deep: true }
)

watch(
  () => settings.value?.namedTables?.[state.selectedTableId]?.categoryFilters,
  (newFilters) => {
    if (newFilters) {
      selectedParentCategories.value = newFilters.selectedParentCategories || []
      selectedChildCategories.value = newFilters.selectedChildCategories || []
      updateCategories(selectedParentCategories.value, selectedChildCategories.value)
    }
  },
  { deep: true }
)

// Watch to update available parameters when data changes
watch(
  () => scheduleData.value,
  (newData) => {
    if (!newData) return
    const categories = [...new Set(newData.map((item) => item.category))]
    categories.forEach((category) => {
      const example = newData.find((item) => item.category === category)
      console.log(`Category ${category} sample:`, {
        mainFields: example ? Object.keys(example) : [],
        detailFields: example?.details?.[0] ? Object.keys(example.details[0]) : [],
        sampleItem: example
      })
    })
  },
  { immediate: true }
)

// Add these console logs in Schedules.vue:
watch(
  () => availableHeaders.value,
  (newHeaders) => {
    if (!newHeaders) return
    console.log('Available Headers Updated:', {
      parentHeadersCount: newHeaders.parent.length,
      childHeadersCount: newHeaders.child.length,
      parentGroups: [...new Set(newHeaders.parent.map((h) => h.category))],
      childGroups: [...new Set(newHeaders.child.map((h) => h.category))]
    })
  },
  { deep: true }
)

watch(
  () => selectedParentCategories.value,
  (newCategories) => {
    if (!newCategories) return
    console.log('Parent Categories changed:', newCategories)
  }
)

watch(
  () => selectedChildCategories.value,
  (newCategories) => {
    if (!newCategories) return
    console.log('Child Categories changed:', newCategories)
  }
)

watch(
  [currentTableColumns, currentDetailColumns],
  () => {
    if (selectedParentCategories.value.length > 0) {
      updateCategories(selectedParentCategories.value, selectedChildCategories.value)
    }
  },
  { deep: true }
)
</script>

<style scoped>
.random {
  display: none;
}
</style>
