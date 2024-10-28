<template>
  <div>
    <ViewerLayoutPanel :initial-width="400" @close="$emit('close')">
      <template #title>Elements Schedule</template>
      <template #actions>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-2 flex-1">
            <!-- Table Selection Dropdown -->
            <label>Select Table:</label>
            <select v-model="selectedTableId" @change="handleTableChange">
              <option value="" disabled>Select a table</option>
              <option v-for="(table, id) in namedTables" :key="id" :value="id">
                {{ table.name }}
              </option>
            </select>
            <!-- Current Table Name Input -->
            <input
              v-model="tableName"
              type="text"
              class="flex-1 px-2 py-1 rounded border bg-background text-sm"
              placeholder="Enter table name"
            />

            <!-- Save Button -->
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

const emit = defineEmits(['close'])
const TABLE_ID = 'elements-schedule'
const { settings, loading, saveSettings, loadSettings } = useUserSettings()

// Handle table selection change
const handleTableChange = () => {
  console.log('Selected table changed:', selectedTableId.value)
}

// Get schedule data
const { scheduleData = ref([]), updateCategories } = useElementsData()

// UI State
const tableName = ref('')
const showCategoryOptions = ref(false)
const expandedRows = ref([])
const selectedTableId = ref<string | null>(null)

// Computed property for named tables from settings
const namedTables = computed(() => {
  console.log('Settings value:', settings.value)
  console.log('Named tables from settings:', settings.value?.tables?.namedTables)
  // return settings.value?.namedTables || {}
  return settings.value?.tables?.namedTables || {}
})

// Watch for settings changes to initialize tables
watch(
  () => settings.value,
  (newSettings) => {
    if (newSettings?.namedTables) {
      console.log('Named tables loaded:', newSettings.namedTables)
    }
  },
  { immediate: true }
)

// Get current table ID (either selected or default)
const currentTableId = computed(() => selectedTableId.value || TABLE_ID)
const currentTableName = computed(() => {
  if (selectedTableId.value) {
    return namedTables.value[selectedTableId.value]?.name || ''
  }
  return 'Default Table'
})

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

// Default column configurations
const defaultParentColumns = [
  { field: 'category', header: 'Category', visible: true, removable: false, order: 0 },
  { field: 'name', header: 'Name', visible: true, removable: false, order: 1 },
  { field: 'level', header: 'Level', visible: true, removable: true, order: 2 }
]

const defaultChildColumns = [
  { field: 'type', header: 'Type', visible: true, removable: false, order: 0 },
  { field: 'material', header: 'Material', visible: true, removable: true, order: 1 },
  {
    field: 'dimensions',
    header: 'Dimensions',
    visible: true,
    removable: true,
    order: 2
  }
]

// Modified column getters to work with both named and default tables
const currentTableColumns = computed(() => {
  if (selectedTableId.value) {
    const tableConfig = settings.value?.tables?.namedTables?.[selectedTableId.value]
    return tableConfig?.parentColumns?.length > 0
      ? [...tableConfig.parentColumns].sort((a, b) => a.order - b.order)
      : defaultParentColumns
  }

  const savedColumns = settings.value?.tables?.[TABLE_ID]?.parentColumns
  if (savedColumns?.length > 0) {
    return [...savedColumns].sort((a, b) => a.order - b.order)
  }
  return defaultParentColumns
})

const currentDetailColumns = computed(() => {
  if (selectedTableId.value) {
    const tableConfig = settings.value?.tables?.namedTables?.[selectedTableId.value]
    return tableConfig?.childColumns?.length > 0
      ? [...tableConfig.childColumns].sort((a, b) => a.order - b.order)
      : defaultChildColumns
  }

  const savedColumns = settings.value?.tables?.[TABLE_ID]?.childColumns
  if (savedColumns?.length > 0) {
    return [...savedColumns].sort((a, b) => a.order - b.order)
  }
  return defaultChildColumns
})

// Create new table
const saveTable = async () => {
  if (!tableName.value) return

  try {
    const currentSettings = settings.value || {}
    console.log('Current settings before save:', currentSettings)

    if (selectedTableId.value) {
      // Update existing table
      const newTableConfig = {
        ...currentSettings,
        tables: {
          ...currentSettings.tables,
          [selectedTableId.value]: {
            ...currentSettings.tables?.[selectedTableId.value],
            name: tableName.value,
            parentColumns: [...parentTableConfig.value],
            childColumns: [...childTableConfig.value],
            categoryFilters: {
              selectedParentCategories: selectedParentCategories.value,
              selectedChildCategories: selectedChildCategories.value
            }
          }
        }
      }
      console.log('Updated existing table:', selectedTableId.value)
      console.log('Attempting to save table configuration:', newTableConfig)

      await saveSettings(newTableConfig) // Save the updated configuration
      await loadSettings() // Refresh the settings after saving
      console.log('Settings after save and reload:', settings.value)
    } else {
      // Create new table
      const newTableId = crypto.randomUUID()
      const updatedSettings = {
        ...currentSettings,
        tables: {
          ...currentSettings.tables,
          [newTableId]: {
            id: newTableId,
            name: tableName.value,
            parentColumns: [...defaultParentColumns],
            childColumns: [...defaultChildColumns],
            categoryFilters: {
              selectedParentCategories: [],
              selectedChildCategories: []
            }
          }
        }
      }
      console.log('Created new table:', newTableId)
      console.log('Attempting to save new settings:', updatedSettings)

      await saveSettings(updatedSettings) // Save the new table configuration
      await loadSettings() // Refresh the settings after saving
      console.log('Settings after save and reload:', settings.value)
    }
  } catch (error) {
    console.error('Error saving table:', error)
    throw error
  }
}

// Handlers for column updates
const handleParentColumnsUpdate = async (newColumns) => {
  try {
    if (!newColumns?.length) return

    const columnsToSave = newColumns.map((col, index) => ({
      ...col,
      order: index,
      visible: col.visible ?? true,
      header:
        col.header || defaultParentColumns.find((c) => c.field === col.field)?.header,
      field: col.field
    }))

    if (selectedTableId.value) {
      const currentSettings = settings.value || {}
      const newTableConfig = {
        ...currentSettings,
        tables: {
          ...currentSettings.tables,
          namedTables: {
            ...currentSettings.tables?.namedTables,
            [selectedTableId.value]: {
              ...currentSettings.tables?.namedTables?.[selectedTableId.value],
              parentColumns: columnsToSave
            }
          }
        }
      }

      console.log('Attempting to save parent columns:', newTableConfig)

      await saveSettings(newTableConfig)
      await loadSettings() // Refresh the settings after saving
      console.log('Settings after save and reload:', settings.value)
    } else {
      await saveSettings({
        parentColumns: columnsToSave
      })
    }
  } catch (error) {
    console.error('Failed to save parent columns:', error)
  }
}

// Modified handlers for multi-table support
const handleChildColumnsUpdate = async (newColumns) => {
  try {
    if (!newColumns?.length) {
      console.error('No columns provided to update')
      return
    }

    const columnsToSave = newColumns.map((col, index) => ({
      ...col,
      order: index,
      visible: col.visible ?? true,
      header:
        col.header || defaultChildColumns.find((c) => c.field === col.field)?.header,
      field: col.field
    }))

    if (selectedTableId.value) {
      const currentSettings = settings.value || {}
      const newTableConfig = {
        ...currentSettings,
        tables: {
          ...currentSettings.tables,
          namedTables: {
            ...currentSettings.tables?.namedTables,
            [selectedTableId.value]: {
              ...currentSettings.tables?.namedTables?.[selectedTableId.value],
              childColumns: columnsToSave
            }
          }
        }
      }

      console.log('Attempting to save child columns:', newTableConfig)

      await saveSettings(newTableConfig)
      await loadSettings() // Refresh the settings after saving
      console.log('Settings after save and reload:', settings.value)
    } else {
      await saveSettings({
        childColumns: columnsToSave
      })
    }
  } catch (error) {
    console.error('Failed to save child columns:', error)
  }
}

const handleBothColumnsUpdate = async (updates: {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
}) => {
  try {
    const { parentColumns, childColumns } = updates

    const parentColumnsToSave = parentColumns?.map((col, index) => ({
      ...col,
      order: index,
      visible: col.visible ?? true
    }))

    const childColumnsToSave = childColumns?.map((col, index) => ({
      ...col,
      order: index,
      visible: col.visible ?? true
    }))

    if (selectedTableId.value) {
      const currentSettings = settings.value || {}
      const newTableConfig = {
        ...currentSettings,
        tables: {
          ...currentSettings.tables,
          namedTables: {
            ...currentSettings.tables?.namedTables,
            [selectedTableId.value]: {
              ...currentSettings.tables?.namedTables?.[selectedTableId.value],
              parentColumns: parentColumnsToSave,
              childColumns: childColumnsToSave
            }
          }
        }
      }

      console.log('Attempting to save column updates:', newTableConfig)

      await saveSettings(newTableConfig)
      await loadSettings() // Refresh the settings after saving
      console.log('Settings after save and reload:', settings.value)
    } else {
      await saveSettings({
        parentColumns: parentColumnsToSave,
        childColumns: childColumnsToSave
      })
    }
  } catch (error) {
    console.error('Failed to save column updates:', error)
  }
}

const handleColumnReorder = async (event) => {
  console.log('Column reorder started')
  const dataTable = event.target.closest('.p-datatable')
  const isChildTable = dataTable.classList.contains('nested-table')

  // Get headers and build reordered columns list
  const headers = Array.from(dataTable.querySelectorAll('th[data-field]'))
  const reorderedColumns = headers
    .map((header, index) => {
      const field = header.getAttribute('data-field')
      const sourceColumns = isChildTable
        ? currentDetailColumns.value
        : currentTableColumns.value
      const existingColumn = sourceColumns.find((col) => col.field === field)

      return {
        ...existingColumn,
        order: index,
        visible: true,
        header: existingColumn?.header,
        field: existingColumn?.field
      }
    })
    .filter(Boolean)

  console.log('Reordered columns before save:', reorderedColumns)

  try {
    if (selectedTableId.value) {
      const currentSettings = settings.value || {}
      const newTableConfig = {
        ...currentSettings,
        tables: {
          ...currentSettings.tables,
          namedTables: {
            ...currentSettings.tables?.namedTables,
            [selectedTableId.value]: {
              ...currentSettings.tables?.namedTables?.[selectedTableId.value],
              [isChildTable ? 'childColumns' : 'parentColumns']: reorderedColumns
            }
          }
        }
      }

      console.log('Attempting to save reordered columns:', newTableConfig)

      await saveSettings(newTableConfig)
      await loadSettings() // Refresh the settings after saving
      console.log('Settings after save and reload:', settings.value)
    } else {
      await saveSettings({
        [isChildTable ? 'childColumns' : 'parentColumns']: reorderedColumns
      })
    }

    console.log('Columns saved successfully')

    // Force a table refresh by updating the key
    tableKey.value = Date.now().toString()
  } catch (error) {
    console.error('Failed to save reordered columns:', error)
  }
}

const toggleParentCategory = (category: string) => {
  if (!currentTableId.value) return

  const current = selectedParentCategories.value
  const updated = current.includes(category)
    ? current.filter((c) => c !== category)
    : [...current, category]

  selectedParentCategories.value = updated
  updateCategories(updated, selectedChildCategories.value)

  // If using a named table, save the category filters
  if (selectedTableId.value) {
    const currentSettings = settings.value || {}
    saveSettings({
      ...currentSettings,
      tables: {
        ...currentSettings.tables,
        namedTables: {
          ...currentSettings.tables?.namedTables,
          [selectedTableId.value]: {
            ...currentSettings.tables?.namedTables?.[selectedTableId.value],
            categoryFilters: {
              selectedParentCategories: updated,
              selectedChildCategories: selectedChildCategories.value
            }
          }
        }
      }
    }).catch((error) => {
      console.error('Failed to save parent category filters:', error)
    })
  }
}

const toggleChildCategory = (category: string) => {
  if (!currentTableId.value) return

  const current = selectedChildCategories.value
  const updated = current.includes(category)
    ? current.filter((c) => c !== category)
    : [...current, category]

  selectedChildCategories.value = updated
  updateCategories(selectedParentCategories.value, updated)

  // If using a named table, save the category filters
  if (selectedTableId.value) {
    const currentSettings = settings.value || {}
    saveSettings({
      ...currentSettings,
      tables: {
        ...currentSettings.tables,
        namedTables: {
          ...currentSettings.tables?.namedTables,
          [selectedTableId.value]: {
            ...currentSettings.tables?.namedTables?.[selectedTableId.value],
            categoryFilters: {
              selectedParentCategories: selectedParentCategories.value,
              selectedChildCategories: updated
            }
          }
        }
      }
    }).catch((error) => {
      console.error('Failed to save child category filters:', error)
    })
  }
}

// Watch for selected table changes
watch(
  selectedTableId,
  (newId) => {
    if (newId) {
      const selectedTable = namedTables.value[newId]
      if (selectedTable) {
        tableName.value = selectedTable.name
        // Load other table-specific settings
        selectedParentCategories.value =
          selectedTable.categoryFilters?.selectedParentCategories || []
        selectedChildCategories.value =
          selectedTable.categoryFilters?.selectedChildCategories || []
        updateCategories(selectedParentCategories.value, selectedChildCategories.value)
      }
    } else {
      tableName.value = ''
      // Reset to default settings
      selectedParentCategories.value = []
      selectedChildCategories.value = []
      updateCategories([], [])
    }
  },
  { immediate: true }
)

watch(
  selectedTableId,
  (newId) => {
    if (newId) {
      const selectedTable = namedTables.value[newId]
      tableName.value = selectedTable?.name || ''
    } else {
      tableName.value = ''
    }
  },
  { immediate: true }
)

watch(
  () => settings.value?.tables?.namedTables,
  (newTables) => {
    console.log('Named tables changed:', newTables)
  },
  { deep: true }
)

// Update the tableKey computation to include selected table
const tableKey = computed(() => {
  if (selectedTableId.value) {
    const tableConfig = settings.value?.tables?.namedTables?.[selectedTableId.value]
    return JSON.stringify({
      id: selectedTableId.value,
      parent: tableConfig?.parentColumns,
      child: tableConfig?.childColumns
    })
  }

  return JSON.stringify({
    parent: settings.value?.tables?.[TABLE_ID]?.parentColumns,
    child: settings.value?.tables?.[TABLE_ID]?.childColumns
  })
})
onMounted(async () => {
  // Load initial settings
  await loadSettings()

  // If no settings exist, initialize with defaults
  if (!settings.value?.tables?.[TABLE_ID]) {
    console.log('Initializing default settings')
    await saveSettings({
      parentColumns: defaultParentColumns,
      childColumns: defaultChildColumns
    })
  }

  const currentSettings = {
    isLoading: loading.value,
    settings: settings.value,
    parentColumns: settings.value?.tables?.[TABLE_ID]?.parentColumns,
    childColumns: settings.value?.tables?.[TABLE_ID]?.childColumns,
    tableColumns: currentTableColumns.value, // Changed from tableColumns to currentTableColumns
    detailColumns: currentDetailColumns.value // Changed from detailColumns to currentDetailColumns
  }
  console.log('Component mounted with:', currentSettings)

  // Debug logging
  watch(
    () => settings.value?.tables?.[TABLE_ID],
    (newSettings) => {
      console.log('Table settings changed:', {
        parentColumns: newSettings?.parentColumns,
        childColumns: newSettings?.childColumns
      })
    },
    { deep: true }
  )
})
</script>

<style scoped>
.random {
  display: none;
}
</style>
