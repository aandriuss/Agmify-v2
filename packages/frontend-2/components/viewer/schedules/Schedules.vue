<template>
  <div>
    <ViewerLayoutPanel :initial-width="400" @close="$emit('close')">
      <template #title>Elements Schedule</template>
      <template #actions>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-2 flex-1">
            <!-- Table Selection Dropdown -->
            <label for="table-select" class="text-sm">Select Table:</label>
            <select
              id="table-select"
              v-model="state.selectedTableId"
              class="px-2 py-1 rounded border bg-background text-sm h-8 min-w-[150px]"
              @change="handleTableChange"
            >
              <option value="">Create New Table</option>
              <option v-for="table in tablesArray" :key="table.id" :value="table.id">
                {{ table.name }}
              </option>
            </select>

            <label for="table-name" class="sr-only">Table Name</label>
            <input
              id="table-name"
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
                    @click="() => toggleCategory('parent', category)"
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
                    @click="() => toggleCategory('child', category)"
                  >
                    {{ category }}
                  </FormButton>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DataTable
          :key="state.tableKey"
          :table-id="currentTableId"
          :table-name="state.tableName"
          :data="scheduleData"
          :columns="currentTableColumns"
          :detail-columns="currentDetailColumns"
          :available-parent-parameters="mergedParentParameters"
          :available-child-parameters="mergedChildParameters"
          @update:both-columns="handleBothColumnsUpdate"
          @table-updated="handleTableUpdate"
        />
      </div>
    </ViewerLayoutPanel>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useUserSettings } from '~/composables/useUserSettings'
import { useElementsData } from '~/components/viewer/schedules/composables/useElementsData'
import DataTable from '~/components/viewer/components/tables/DataTable/index.vue'
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/vue/24/solid'
import { CheckCircleIcon as CheckCircleIconOutlined } from '@heroicons/vue/24/outline'

import type { ParameterDefinition } from '../components/parameters/composables/parameterDefinitions'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'

import {
  mergeAndCategorizeParameters,
  fixedParentParameters,
  fixedChildParameters
} from '~/components/viewer/components/tables/DataTable/composables/parameters/parameterManagement'

interface TableState {
  selectedTableId: string
  tableName: string
  showCategoryOptions: boolean
  expandedRows: Record<string, unknown>[]
  tableKey: string
  initialized: boolean
  loadingError: Error | null
}

const DEFAULT_TABLE_ID = 'elements-schedule'
const { settings, loadSettings, createNamedTable, updateNamedTable } = useUserSettings()

const state = reactive<TableState>({
  selectedTableId: DEFAULT_TABLE_ID,
  tableName: 'Default Schedule',
  showCategoryOptions: false,
  expandedRows: [],
  tableKey: Date.now().toString(),
  initialized: false,
  loadingError: null
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

// Category toggle function
const toggleCategory = (type: 'parent' | 'child', category: string): void => {
  if (type === 'parent') {
    const index = selectedParentCategories.value.indexOf(category)
    selectedParentCategories.value =
      index === -1
        ? [...selectedParentCategories.value, category]
        : selectedParentCategories.value.filter((cat) => cat !== category)
  } else {
    const index = selectedChildCategories.value.indexOf(category)
    selectedChildCategories.value =
      index === -1
        ? [...selectedChildCategories.value, category]
        : selectedChildCategories.value.filter((cat) => cat !== category)
  }

  updateCategories(selectedParentCategories.value, selectedChildCategories.value)
}

// Computed property for tables array
const tablesArray = computed(() => {
  const tables = settings.value?.namedTables || {}
  return Object.entries(tables).map(([id, table]) => ({
    id,
    name: table.name
  }))
})

function processColumn(col: Partial<ColumnDef>, index: number): ColumnDef {
  return {
    field: col.field || '',
    header: col.header || '',
    type: col.type || 'string',
    order: col.order ?? index,
    visible: col.visible ?? true,
    removable: col.removable ?? true,
    width: col.width,
    category: col.category,
    description: col.description,
    isFixed: col.isFixed
  }
}

// Default column configurations
const defaultParentColumns: ColumnDef[] = [
  {
    field: 'category',
    header: 'Category',
    type: 'string',
    visible: true,
    removable: false,
    order: 0
  },
  {
    field: 'id',
    header: 'ID',
    type: 'string',
    visible: true,
    removable: true,
    order: 1
  },
  {
    field: 'mark',
    header: 'Mark',
    type: 'string',
    visible: true,
    removable: true,
    order: 2
  },
  {
    field: 'host',
    header: 'Host',
    type: 'string',
    visible: true,
    removable: true,
    order: 3
  },
  {
    field: 'comment',
    header: 'Comment',
    type: 'string',
    visible: true,
    removable: true,
    order: 4
  }
].map((col, index) => processColumn(col, index))

const defaultChildColumns: ColumnDef[] = [
  {
    field: 'category',
    header: 'Category',
    type: 'string',
    visible: true,
    removable: false,
    order: 0
  },
  {
    field: 'id',
    header: 'ID',
    type: 'string',
    visible: true,
    removable: true,
    order: 1
  },
  {
    field: 'mark',
    header: 'Mark',
    type: 'string',
    visible: true,
    removable: true,
    order: 2
  },
  {
    field: 'host',
    header: 'Host',
    type: 'string',
    visible: true,
    removable: true,
    order: 3
  },
  {
    field: 'comment',
    header: 'Comment',
    type: 'string',
    visible: true,
    removable: true,
    order: 4
  }
].map((col, index) => processColumn(col, index))

// Computed properties for table management
const currentTableId = computed(() => state.selectedTableId || DEFAULT_TABLE_ID)

// Get current table
const currentTable = computed(() => {
  return settings.value?.namedTables?.[currentTableId.value]
})

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
const { scheduleData, updateCategories, availableHeaders } = useElementsData({
  currentTableColumns,
  currentDetailColumns
})

// Handle table selection
const handleTableSelection = (tableId: string): void => {
  const selectedTable = settings.value?.namedTables?.[tableId]
  if (selectedTable?.categoryFilters) {
    // Create new arrays for categories
    selectedParentCategories.value = [
      ...(selectedTable.categoryFilters.selectedParentCategories || [])
    ]
    selectedChildCategories.value = [
      ...(selectedTable.categoryFilters.selectedChildCategories || [])
    ]
    updateCategories(selectedParentCategories.value, selectedChildCategories.value)
  } else {
    // Initialize with empty arrays if no filters exist
    selectedParentCategories.value = []
    selectedChildCategories.value = []
    updateCategories([], [])
  }
}

// Handle table update
const handleTableUpdate = async ({
  tableId,
  tableName
}: {
  tableId: string
  tableName: string
}) => {
  try {
    // Update current table state if needed
    if (currentTable.value?.id === tableId) {
      state.tableName = tableName
      state.selectedTableId = tableId
      state.tableKey = Date.now().toString() // Force refresh

      // Reload settings and update categories
      await loadSettings()
      handleTableSelection(tableId)
    }
  } catch (error) {
    state.loadingError = error as Error
  }
}

// Update mergeColumnDefinitions to handle type differences
function mergeColumnDefinitions(
  available: ParameterDefinition[],
  saved: Partial<ColumnDef>[]
): ColumnDef[] {
  return saved.map((savedCol, index) => {
    const availableParam = available.find((p) => p.field === savedCol.field)
    if (availableParam) {
      return processColumn(
        {
          ...savedCol,
          header: availableParam.header,
          category: availableParam.category,
          type: availableParam.type
        },
        index
      )
    }
    return processColumn(savedCol, index)
  })
}

// Column update handlers
const handleParentColumnsUpdate = async (newColumns: Partial<ColumnDef>[]) => {
  try {
    if (!newColumns?.length) return

    const currentTable = settings.value?.namedTables?.[currentTableId.value]
    if (!currentTable) return

    const columnsToSave = newColumns.map((col, index) => processColumn(col, index))

    await updateNamedTable(currentTableId.value, {
      ...currentTable,
      parentColumns: columnsToSave,
      childColumns: currentTable.childColumns,
      name: currentTable.name,
      categoryFilters: currentTable.categoryFilters
    })

    state.tableKey = Date.now().toString()
  } catch (error) {
    state.loadingError = error as Error
  }
}

const handleChildColumnsUpdate = async (newColumns: Partial<ColumnDef>[]) => {
  try {
    if (!newColumns?.length) return

    const currentTable = settings.value?.namedTables?.[currentTableId.value]
    if (!currentTable) return

    const columnsToSave = newColumns.map((col, index) => processColumn(col, index))

    await updateNamedTable(currentTableId.value, {
      ...currentTable,
      childColumns: columnsToSave,
      parentColumns: currentTable.parentColumns,
      name: currentTable.name,
      categoryFilters: currentTable.categoryFilters
    })

    state.tableKey = Date.now().toString()
  } catch (error) {
    state.loadingError = error as Error
  }
}

const handleBothColumnsUpdate = async (updates: {
  parentColumns: Partial<ColumnDef>[]
  childColumns: Partial<ColumnDef>[]
}) => {
  try {
    const { parentColumns, childColumns } = updates

    const currentTable = settings.value?.namedTables?.[currentTableId.value]
    if (!currentTable) {
      throw new Error('Current table configuration not found')
    }

    const processedParentColumns = parentColumns.map((col, index) =>
      processColumn(col, index)
    )
    const processedChildColumns = childColumns.map((col, index) =>
      processColumn(col, index)
    )

    // Preserve existing table properties and merge with updates
    const updatedTableConfig = {
      ...currentTable,
      parentColumns: processedParentColumns,
      childColumns: processedChildColumns,
      categoryFilters: {
        selectedParentCategories: selectedParentCategories.value,
        selectedChildCategories: selectedChildCategories.value
      },
      lastUpdateTimestamp: Date.now()
    }

    await updateNamedTable(currentTableId.value, updatedTableConfig)
    updateCategories(selectedParentCategories.value, selectedChildCategories.value)
    state.tableKey = Date.now().toString()
  } catch (error) {
    state.loadingError = error as Error
    throw new Error('Failed to update both column sets: ' + (error as Error).message)
  }
}

// Table Management Functions
const handleTableChange = async () => {
  if (state.selectedTableId) {
    const selectedTable = settings.value?.namedTables?.[state.selectedTableId]
    if (selectedTable) {
      state.tableName = selectedTable.name

      selectedParentCategories.value = [
        ...(selectedTable.categoryFilters?.selectedParentCategories || [])
      ]
      selectedChildCategories.value = [
        ...(selectedTable.categoryFilters?.selectedChildCategories || [])
      ]

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

      updateCategories(selectedParentCategories.value, selectedChildCategories.value)
      state.tableKey = Date.now().toString()
    }
  }
}

const saveTable = async () => {
  if (!state.tableName) return

  try {
    if (state.selectedTableId) {
      const currentTable = settings.value?.namedTables?.[state.selectedTableId]
      if (!currentTable) {
        throw new Error('Table not found in current settings')
      }

      await updateNamedTable(state.selectedTableId, {
        ...currentTable,
        name: state.tableName,
        parentColumns: currentTableColumns.value,
        childColumns: currentDetailColumns.value,
        categoryFilters: {
          selectedParentCategories: selectedParentCategories.value,
          selectedChildCategories: selectedChildCategories.value
        }
      })
    } else {
      const newTableId = await createNamedTable(state.tableName, {
        parentColumns: defaultParentColumns,
        childColumns: defaultChildColumns,
        categoryFilters: {
          selectedParentCategories: selectedParentCategories.value,
          selectedChildCategories: selectedChildCategories.value
        }
      })

      if (!newTableId) {
        throw new Error('Failed to get new table ID')
      }

      state.selectedTableId = newTableId
      await loadSettings()

      const savedTable = settings.value?.namedTables?.[newTableId]
      if (!savedTable) {
        throw new Error('Failed to verify table save')
      }

      state.tableName = savedTable.name
      selectedParentCategories.value =
        savedTable.categoryFilters?.selectedParentCategories || []
      selectedChildCategories.value =
        savedTable.categoryFilters?.selectedChildCategories || []
      updateCategories(selectedParentCategories.value, selectedChildCategories.value)
    }

    state.tableKey = Date.now().toString()
  } catch (error) {
    state.loadingError = error as Error
    throw error
  }
}

// Computed Properties
const mergedParentParameters = computed(() =>
  mergeAndCategorizeParameters(
    fixedParentParameters,
    availableHeaders.value.parent,
    selectedParentCategories.value
  )
)

const mergedChildParameters = computed(() =>
  mergeAndCategorizeParameters(
    fixedChildParameters,
    availableHeaders.value.child,
    selectedChildCategories.value
  )
)

// Initialize on mount
onMounted(async () => {
  try {
    await loadSettings()
    if (currentTable.value) {
      handleTableSelection(currentTableId.value)
    }
    state.initialized = true
  } catch (error) {
    state.loadingError = error as Error
  }
})
</script>

<style scoped>
.random {
  display: none;
}
</style>
