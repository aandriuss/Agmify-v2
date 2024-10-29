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
              v-model="selectedTableId"
              class="px-2 py-1 rounded border bg-background text-sm h-8 min-w-[150px]"
              @change="handleTableChange"
            >
              <option value="">Create New Table</option>
              <option v-for="table in tablesArray" :key="table.id" :value="table.id">
                {{ table.name }}
              </option>
            </select>

            <input
              v-model="tableName"
              type="text"
              class="flex-1 px-2 py-1 rounded border bg-background text-sm h-8"
              placeholder="Enter table name"
            />

            <FormButton
              text
              size="sm"
              color="primary"
              :disabled="!tableName"
              @click="saveTable"
            >
              {{ selectedTableId ? 'Update' : 'Save New' }}
            </FormButton>
          </div>

          <!-- Category Filter Button -->
          <FormButton
            text
            size="sm"
            color="subtle"
            :icon-right="showCategoryOptions ? ChevronUpIcon : ChevronDownIcon"
            @click="showCategoryOptions = !showCategoryOptions"
          >
            Category filter options
          </FormButton>
        </div>
      </template>

      <div class="flex flex-col">
        <!-- Category Options Section -->
        <div
          v-show="showCategoryOptions"
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
          :key="tableKey"
          v-model:expandedRows="expandedRows"
          :table-id="currentTableId"
          :data="scheduleData || []"
          :columns="currentTableColumns"
          :detail-columns="currentDetailColumns"
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
import { ref, computed, watch, onMounted } from 'vue'
import { useUserSettings } from '~/composables/useUserSettings'
import { useElementsData } from '~/composables/useElementsData'
import DataTable from '~/components/viewer/tables/DataTable.vue'
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/vue/24/solid'
import { CheckCircleIcon as CheckCircleIconOutlined } from '@heroicons/vue/24/outline'

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

// Get schedule data
const { scheduleData = ref([]), updateCategories } = useElementsData()

// Add detailed data inspection
console.log('Full Schedule Data:', {
  rawData: scheduleData.value,
  firstParentItem: scheduleData.value?.[0] || null,
  firstChildItem: scheduleData.value?.[0]?.details?.[0] || null,
  parentFields: scheduleData.value?.[0] ? Object.keys(scheduleData.value[0]) : [],
  childFields: scheduleData.value?.[0]?.details?.[0]
    ? Object.keys(scheduleData.value[0].details[0])
    : []
})

// UI State
const tableName = ref('')
const showCategoryOptions = ref(false)
const expandedRows = ref([])
const selectedTableId = ref<string | null>(null)
const tableKey = ref(Date.now().toString())

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
const currentTableId = computed(() => selectedTableId.value || DEFAULT_TABLE_ID)

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

const availableParentParameters = ref([
  { field: 'category', header: 'Category' },
  { field: 'id', header: 'ID' },
  { field: 'mark', header: 'Mark' },
  { field: 'host', header: 'Host' },
  { field: 'comment', header: 'Comment' }
])

const availableChildParameters = ref([
  { field: 'category', header: 'Category' },
  { field: 'id', header: 'ID' },
  { field: 'mark', header: 'Mark' },
  { field: 'host', header: 'Host' },
  { field: 'comment', header: 'Comment' }
])

const extractColumnsFromData = (data: any[]) => {
  if (!data || data.length === 0) return []

  const firstItem = data[0]
  return Object.keys(firstItem)
    .filter((key) => !['details', 'length', 'lastIndex', 'lastItem'].includes(key))
    .map((field, index) => ({
      field,
      header: field.charAt(0).toUpperCase() + field.slice(1), // Capitalize first letter
      visible: true,
      removable: field !== 'category',
      order: index
    }))
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

// Handle table selection change
const handleTableChange = () => {
  if (selectedTableId.value) {
    const selectedTable = settings.value?.namedTables?.[selectedTableId.value]
    if (selectedTable) {
      tableName.value = selectedTable.name
      selectedParentCategories.value =
        selectedTable.categoryFilters?.selectedParentCategories || []
      selectedChildCategories.value =
        selectedTable.categoryFilters?.selectedChildCategories || []
      updateCategories(selectedParentCategories.value, selectedChildCategories.value)

      // Force table refresh when switching tables
      tableKey.value = Date.now().toString()
    }
  } else {
    tableName.value = ''
    selectedParentCategories.value = []
    selectedChildCategories.value = []
    updateCategories([], [])
    // Also force refresh when clearing table selection
    tableKey.value = Date.now().toString()
  }
}

// Save table handler
const saveTable = async () => {
  if (!tableName.value) return

  try {
    console.log('Starting table save...')

    if (selectedTableId.value) {
      // Update existing table
      console.log('Updating existing table:', selectedTableId.value)

      const currentTable = settings.value?.namedTables?.[selectedTableId.value]
      if (!currentTable) {
        throw new Error('Table not found in current settings')
      }

      await updateNamedTable(selectedTableId.value, {
        name: tableName.value,
        parentColumns: currentTableColumns.value,
        childColumns: currentDetailColumns.value,
        categoryFilters: {
          selectedParentCategories: selectedParentCategories.value,
          selectedChildCategories: selectedChildCategories.value
        }
      })
    } else {
      // Create new table
      console.log('Creating new table:', tableName.value)

      // Create new table and get its ID
      const newTableId = await createNamedTable(tableName.value, {
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
      selectedTableId.value = newTableId
    }

    // Reload settings and verify save
    await loadSettings()

    // Verify the table exists in settings
    const savedTable = settings.value?.namedTables?.[selectedTableId.value]
    if (!savedTable) {
      throw new Error('Failed to verify table save')
    }

    console.log('Table saved successfully:', savedTable)

    // Update UI state
    tableName.value = savedTable.name
    selectedParentCategories.value =
      savedTable.categoryFilters?.selectedParentCategories || []
    selectedChildCategories.value =
      savedTable.categoryFilters?.selectedChildCategories || []
    updateCategories(selectedParentCategories.value, selectedChildCategories.value)

    // Refresh table
    tableKey.value = Date.now().toString()
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
    tableKey.value = Date.now().toString()
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
    tableKey.value = Date.now().toString()
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

    // Update while preserving other table settings
    await updateNamedTable(currentTableId.value, {
      ...currentTable,
      parentColumns: processedParentColumns,
      childColumns: processedChildColumns,
      name: currentTable.name,
      categoryFilters: currentTable.categoryFilters
    })

    // Force table refresh
    tableKey.value = Date.now().toString()
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
    tableKey.value = Date.now().toString()
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

    if (selectedTableId.value) {
      // Get the complete current table state
      const currentTable = settings.value?.namedTables?.[selectedTableId.value]

      // Preserve all existing table data while updating filters
      await updateNamedTable(selectedTableId.value, {
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
    // Revert local state on error
    selectedParentCategories.value = [...selectedParentCategories.value]
    updateCategories(selectedParentCategories.value, selectedChildCategories.value)
  }
}

const toggleChildCategory = async (category: string) => {
  try {
    const current = [...selectedChildCategories.value]
    const updated = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category]

    // Update local state first
    selectedChildCategories.value = updated
    updateCategories(selectedParentCategories.value, updated)

    if (selectedTableId.value) {
      // Get the complete current table state
      const currentTable = settings.value?.namedTables?.[selectedTableId.value]

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
        ...(currentSettings?.namedTables || {}), // Keep any existing tables
        [DEFAULT_TABLE_ID]: defaultTable // Add default table
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

    selectedTableId.value = tableToSelect
    const selectedTable = availableTables[tableToSelect]

    if (selectedTable) {
      tableName.value = selectedTable.name
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
  () => settings.value?.namedTables?.[selectedTableId.value]?.categoryFilters,
  (newFilters) => {
    if (newFilters) {
      selectedParentCategories.value = newFilters.selectedParentCategories || []
      selectedChildCategories.value = newFilters.selectedChildCategories || []
      updateCategories(selectedParentCategories.value, selectedChildCategories.value)
    }
  },
  { deep: true }
)

// Watch for table ID changes
watch(
  () => selectedTableId.value,
  (newTableId) => {
    if (newTableId) {
      const selectedTable = settings.value?.namedTables?.[newTableId]
      if (selectedTable) {
        // Force table refresh when table ID changes
        tableKey.value = Date.now().toString()
      }
    }
  }
)

// Watch to update available parameters when data changes
watch(
  scheduleData,
  (newData) => {
    if (newData && newData.length > 0) {
      const parentFields = extractColumnsFromData(newData)
      const childFields = extractColumnsFromData(newData[0]?.details || [])

      // Only update if we have new fields
      if (parentFields.length > 0) {
        availableParentParameters.value = parentFields
      }
      if (childFields.length > 0) {
        availableChildParameters.value = childFields
      }
    }
  },
  { immediate: true }
)

// temp watch
watch(scheduleData, (newData) => {
  console.log('Updated uuuu scheduleData:', newData)
})
</script>

<style scoped>
.random {
  display: none;
}
</style>
