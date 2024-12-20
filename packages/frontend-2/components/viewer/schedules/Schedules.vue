<template>
  <ViewerLayoutPanel @close="$emit('close')">
    <template #title>Datasets</template>
    <TableLayout class="viewer-container">
      <template #controls>
        <div class="flex items-center gap-4">
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

      <template #actions>
        <div class="flex items-center gap-2">
          <slot name="table-actions" />
        </div>
      </template>

      <LoadingState
        :is-loading="isLoading"
        :error="error"
        loading-message="Loading schedule data..."
      >
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
                      categories.selectedParentCategories.value.includes(category)
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
                      categories.selectedChildCategories.value.includes(category)
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

        <div class="schedule-container">
          <ScheduleMainView
            :selected-table-id="store.selectedTableId.value || ''"
            :current-table="_currentTable"
            :is-initialized="isInitialized"
            :table-name="store.tableName.value || ''"
            :current-table-id="store.currentTableId.value || ''"
            :table-key="store.tableKey.value || '0'"
            :error="error"
            :parent-base-columns="parameterStore.parentColumnDefinitions.value"
            :parent-available-columns="
              parameterStore.parentAvailableBimParameters.value
            "
            :parent-visible-columns="
              parameterStore.parentSelectedParameters.value.filter((p) => p.visible)
            "
            :child-base-columns="parameterStore.childColumnDefinitions.value"
            :child-available-columns="parameterStore.childAvailableBimParameters.value"
            :child-visible-columns="
              parameterStore.childSelectedParameters.value.filter((p) => p.visible)
            "
            :schedule-data="store.scheduleData.value || []"
            :evaluated-data="store.evaluatedData.value || []"
            :table-data="store.tableData.value || []"
            :is-loading="isLoading"
            :is-loading-additional-data="isUpdating"
            :has-selected-categories="categories.hasSelectedCategories.value"
            :selected-parent-categories="categories.selectedParentCategories.value"
            :selected-child-categories="categories.selectedChildCategories.value"
            :show-parameter-manager="_interactions.showParameterManager.value"
            :parent-elements="parentElements"
            :child-elements="childElements"
            :is-test-mode="false"
            @error="handleError"
            @table-updated="handleTableDataUpdate"
            @column-visibility-change="handleColumnVisibilityChange"
          />
        </div>
      </LoadingState>
    </TableLayout>
  </ViewerLayoutPanel>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from '~/composables/core/store'
import { useElementsData } from '~/composables/core/tables/state/useElementsData'
import { useTableInteractions } from '~/composables/core/tables/interactions/useTableInteractions'
import { useTableInitialization } from '~/composables/core/tables/initialization/useTableInitialization'
import { useTableCategories } from '~/composables/core/tables/categories/useTableCategories'
import { useBIMElements } from '~/composables/core/tables/state/useBIMElements'
import { useParameterStore } from '~/composables/core/parameters/store'
import type { NamedTableConfig, ColumnDef, ElementData } from '~/composables/core/types'
import { useTablesState } from '~/composables/settings/tables/useTablesState'
import { useInjectedViewerState } from '~~/lib/viewer/composables/setup'
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/vue/24/solid'
import { CheckCircleIcon as CheckCircleIconOutlined } from '@heroicons/vue/24/outline'
import ScheduleMainView from './components/ScheduleMainView.vue'
import LoadingState from '~/components/core/LoadingState.vue'
import TableLayout from '~/components/core/tables/TableLayout.vue'
import { useViewerEventListener } from '~~/lib/viewer/composables/viewer'
import { ViewerEvent } from '@speckle/viewer'

import type {
  ViewerNode,
  WorldTreeRoot
} from '~/composables/core/types/viewer/viewer-types'

// Available categories
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

// Type-safe array utilities
function safeArrayFrom<T>(value: T[] | undefined | null): T[] {
  return value ? Array.from(value) : []
}

function safeArrayIncludes<T>(array: T[] | undefined | null, value: T): boolean {
  return array ? array.includes(value) : false
}

// Type-safe error handling utility
function createSafeError(err: unknown): Error {
  if (err instanceof Error) return err
  if (typeof err === 'string') return new Error(err)
  return new Error('An unknown error occurred')
}

// Type-safe object utilities
function safeObjectEntries<T extends Record<string, unknown>>(
  obj: T | undefined | null
): [string, T[keyof T]][] {
  if (!obj) return []
  return Object.entries(obj) as [string, T[keyof T]][]
}

// Initialize systems
const debug = useDebug()
const store = useStore()
const parameterStore = useParameterStore()
const tablesState = useTablesState()
const bimElements = useBIMElements({
  childCategories
})

// Get viewer state
const {
  viewer: {
    metadata: { worldTree },
    init
  }
} = useInjectedViewerState()

// Watch for viewer events
useViewerEventListener(ViewerEvent.LoadComplete, () => {
  debug.log(DebugCategories.INITIALIZATION, 'Viewer load complete')

  // Type-safe world tree access
  const treeChildren = (worldTree.value?._root?.children ?? []) as ViewerNode[]
  const childrenCount = Array.isArray(treeChildren) ? treeChildren.length : 0

  debug.log(DebugCategories.DATA, 'World tree state', {
    exists: !!worldTree.value,
    hasRoot: !!worldTree.value?._root,
    childrenCount
  })
})

// Type guard to check if children array exists and is non-empty
function hasValidChildren(
  node: unknown
): node is { _root: { children: ViewerNode[] } } {
  if (!node || typeof node !== 'object') return false
  const candidate = node as { _root?: { children?: ViewerNode[] } }
  return !!(
    candidate._root?.children &&
    Array.isArray(candidate._root.children) &&
    candidate._root.children.length > 0
  )
}

// Watch world tree changes
watch(
  worldTree,
  async (newTree) => {
    if (!hasValidChildren(newTree)) {
      debug.log(DebugCategories.DATA, 'World tree updated but no valid children', {
        exists: !!newTree,
        hasRoot: !!(newTree && '_root' in newTree),
        childrenCount: 0
      })
      return
    }

    // Type-safe children access using type guard
    const children = hasValidChildren(newTree) ? newTree._root.children : []
    debug.log(DebugCategories.DATA, 'World tree updated', {
      exists: true,
      hasRoot: true,
      childrenCount: children.length
    })

    // Create world tree root with verified children
    const treeRoot: WorldTreeRoot = {
      _root: {
        children
      }
    }
    await bimElements.initializeElements(treeRoot)
  },
  { immediate: true }
)

// Initialize refs with proper types
const error = ref<Error | null>(null)
const showCategoryOptions = ref(false)

// Initialize data composables with category refs
const categories = useTableCategories({
  initialState: {
    selectedParentCategories: parentCategories,
    selectedChildCategories: childCategories
  },
  onUpdate: async (state) => {
    await store.lifecycle.update({
      selectedParentCategories: state.selectedParentCategories,
      selectedChildCategories: state.selectedChildCategories
    })
  },
  onError: (err) => updateErrorState(createSafeError(err))
})

const elementsData = useElementsData({
  selectedParentCategories: categories.selectedParentCategories,
  selectedChildCategories: categories.selectedChildCategories
})

// Safe computed properties from state
const parentElements = computed<ElementData[]>(() => {
  if (!elementsData.state.value) return []
  return safeArrayFrom(elementsData.state.value.parentElements)
})

const childElements = computed<ElementData[]>(() => {
  if (!elementsData.state.value) return []
  return safeArrayFrom(elementsData.state.value.childElements)
})

// Get current table from tablesState with type safety
const _currentTable = computed(() => {
  const selectedId = store.selectedTableId.value
  if (!selectedId) return null

  const tables = tablesState.state.value?.tables
  if (!tables) return null

  const tableValues = safeArrayFrom(Object.values(tables))
  return (
    tableValues.find((table): table is NamedTableConfig => isValidTable(table)) || null
  )
})

// Initialize core composables
const { initComponent } = useTableInitialization({
  store,
  initialState: {
    selectedTableId: '',
    tableName: '',
    selectedParentCategories: parentCategories,
    selectedChildCategories: childCategories
  },
  onError: (err) => handleError(createSafeError(err))
})

const _interactions = useTableInteractions({
  store,
  state: {
    selectedTableId: '',
    tableName: '',
    currentTable: null,
    selectedParentCategories: parentCategories,
    selectedChildCategories: childCategories
  },
  initComponent,
  handleError: (err) => handleError(createSafeError(err))
})

// Loading state - only show loading when we have no data
const isLoading = computed(() => {
  const hasData =
    (store.scheduleData.value?.length ?? 0) > 0 ||
    (store.tableData.value?.length ?? 0) > 0
  return (
    !hasData || elementsData.state.value.loading || parameterStore.isProcessing.value
  )
})

const isInitialized = computed(() => store.initialized.value ?? false)

const isUpdating = computed(() => elementsData.state.value.loading)

// Category toggle handlers with type safety
const toggleParentCategory = async (category: string) => {
  const current = safeArrayFrom(categories.selectedParentCategories.value)
  const index = current.indexOf(category)
  if (index === -1) {
    current.push(category)
  } else {
    current.splice(index, 1)
  }
  await store.lifecycle.update({
    selectedParentCategories: current
  })
  await elementsData.initializeData()
}

const toggleChildCategory = async (category: string) => {
  const current = safeArrayFrom(categories.selectedChildCategories.value)
  const index = current.indexOf(category)
  if (index === -1) {
    current.push(category)
  } else {
    current.splice(index, 1)
  }
  await store.lifecycle.update({
    selectedChildCategories: current
  })
  await elementsData.initializeData()
}

// Handler functions with type safety
function handleTableDataUpdate(): void {
  updateErrorState(null)
}

function isValidTable(table: unknown): table is NamedTableConfig {
  if (!table || typeof table !== 'object') return false
  const candidate = table as { id?: unknown }
  return typeof candidate.id === 'string'
}

async function handleColumnVisibilityChange(column: ColumnDef): Promise<void> {
  try {
    debug.log(DebugCategories.COLUMNS, 'Column visibility changed', {
      field: column.field,
      visible: column.visible
    })

    // Update parameter visibility in parameter store
    await parameterStore.updateParameterVisibility(
      column.field,
      column.visible,
      column.kind === 'bim'
    )

    debug.log(DebugCategories.COLUMNS, 'Column visibility updated in parameter store')
  } catch (err) {
    updateErrorState(createSafeError(err))
  }
}

// Type-safe error handling
function updateErrorState(newError: Error | null): void {
  const currentError = error.value
  const shouldUpdate =
    !currentError || !newError || currentError.message !== newError.message

  if (shouldUpdate) {
    error.value = newError
  }

  if (newError) {
    debug.error(DebugCategories.ERROR, 'Schedule error:', {
      name: newError.name,
      message: newError.message,
      stack: newError.stack
    })
  }
}

function handleError(err: unknown): void {
  updateErrorState(createSafeError(err))
}

onMounted(async () => {
  try {
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing schedules')

    // Initialize stores
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing stores')
    await Promise.all([store.lifecycle.init(), parameterStore.init()])
    debug.log(DebugCategories.STATE, 'Stores initialized')

    // Wait for viewer initialization
    debug.log(DebugCategories.INITIALIZATION, 'Waiting for viewer initialization')
    await init.promise
    debug.log(DebugCategories.INITIALIZATION, 'Viewer initialized')

    // Verify parameter store initialization
    if (parameterStore.error.value) {
      throw new Error('Parameter store failed to initialize')
    }

    // Initialize BIM elements
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing BIM elements')
    await bimElements.initializeElements()

    if (!bimElements.allElements.value?.length) {
      debug.warn(DebugCategories.INITIALIZATION, 'No BIM elements found')
    } else {
      debug.log(DebugCategories.INITIALIZATION, 'BIM elements loaded', {
        count: bimElements.allElements.value.length,
        sample: bimElements.allElements.value[0],
        sampleParameters: bimElements.allElements.value[0]?.parameters || {}
      })

      // Log parameter groups for debugging
      const parameterGroups = Array.from(
        new Set(
          bimElements.allElements.value.flatMap((el) =>
            Object.keys(el.parameters || {}).map((key) => key.split('.')[0])
          )
        )
      )
      debug.log(DebugCategories.PARAMETERS, 'Available parameter groups', {
        groups: parameterGroups,
        sample: Object.entries(
          bimElements.allElements.value[0]?.parameters || {}
        ).reduce((acc, [key, value]) => {
          const group = key.split('.')[0]
          if (!acc[group]) acc[group] = {}
          acc[group][key] = value
          return acc
        }, {} as Record<string, Record<string, unknown>>)
      })
    }

    debug.completeState(DebugCategories.INITIALIZATION, 'BIM elements initialized')

    // Initialize data and wait for parameter processing
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing element data')

    // Pre-process check
    debug.log(DebugCategories.PARAMETERS, 'Pre-processing parameter state', {
      elements: bimElements.allElements.value?.length || 0,
      sampleElement: bimElements.allElements.value?.[0],
      sampleParameters: bimElements.allElements.value?.[0]?.parameters || {}
    })

    // Initialize data - this will handle parameter processing
    await elementsData.initializeData()

    // Wait for any pending store operations to complete
    await new Promise((resolve) => requestAnimationFrame(resolve))

    // Verify parameter processing with detailed logging
    const parameterState = {
      raw: {
        parent: parameterStore.parentRawParameters.value?.length || 0,
        child: parameterStore.childRawParameters.value?.length || 0,
        parentSample: parameterStore.parentRawParameters.value?.[0],
        childSample: parameterStore.childRawParameters.value?.[0]
      },
      available: {
        parent: {
          bim: {
            count: parameterStore.parentAvailableBimParameters.value?.length || 0,
            sample: parameterStore.parentAvailableBimParameters.value?.[0]
          },
          user: {
            count: parameterStore.parentAvailableUserParameters.value?.length || 0,
            sample: parameterStore.parentAvailableUserParameters.value?.[0]
          }
        },
        child: {
          bim: {
            count: parameterStore.childAvailableBimParameters.value?.length || 0,
            sample: parameterStore.childAvailableBimParameters.value?.[0]
          },
          user: {
            count: parameterStore.childAvailableUserParameters.value?.length || 0,
            sample: parameterStore.childAvailableUserParameters.value?.[0]
          }
        }
      },
      selected: {
        parent: {
          count: parameterStore.parentSelectedParameters.value?.length || 0,
          sample: parameterStore.parentSelectedParameters.value?.[0]
        },
        child: {
          count: parameterStore.childSelectedParameters.value?.length || 0,
          sample: parameterStore.childSelectedParameters.value?.[0]
        }
      }
    }

    debug.log(
      DebugCategories.PARAMETERS,
      'Parameter state after initialization',
      parameterState
    )

    // Log parameter groups and their values
    const parameterGroups = {
      parent: Array.from(
        new Set(
          parameterStore.parentRawParameters.value?.map((p) => p.sourceGroup) || []
        )
      ).reduce((acc, group) => {
        acc[group] = parameterStore.parentRawParameters.value
          ?.filter((p) => p.sourceGroup === group)
          .map((p) => ({ id: p.id, name: p.name, value: p.value }))
        return acc
      }, {} as Record<string, unknown[]>),
      child: Array.from(
        new Set(
          parameterStore.childRawParameters.value?.map((p) => p.sourceGroup) || []
        )
      ).reduce((acc, group) => {
        acc[group] = parameterStore.childRawParameters.value
          ?.filter((p) => p.sourceGroup === group)
          .map((p) => ({ id: p.id, name: p.name, value: p.value }))
        return acc
      }, {} as Record<string, unknown[]>)
    }

    debug.log(
      DebugCategories.PARAMETERS,
      'Parameter groups and values',
      parameterGroups
    )

    // Log raw parameter sample for debugging
    if (parameterStore.parentRawParameters.value?.length) {
      debug.log(DebugCategories.PARAMETERS, 'Parent raw parameter sample', {
        sample: parameterStore.parentRawParameters.value[0]
      })
    }

    // Verify parameter extraction and processing
    if (parameterState.raw.parent === 0 && parameterState.raw.child === 0) {
      debug.error(DebugCategories.PARAMETERS, 'No parameters extracted', {
        elements: bimElements.allElements.value?.length || 0,
        sample: bimElements.allElements.value?.[0]?.parameters || {},
        elementCategories: Array.from(
          new Set(bimElements.allElements.value?.map((el) => el.category) || [])
        )
      })
      throw new Error('No parameters extracted from elements')
    }

    // Log parameter extraction details
    debug.log(DebugCategories.PARAMETERS, 'Parameter extraction details', {
      elementCount: bimElements.allElements.value?.length || 0,
      elementCategories: Array.from(
        new Set(bimElements.allElements.value?.map((el) => el.category) || [])
      ),
      parameterGroups: Array.from(
        new Set(
          bimElements.allElements.value?.flatMap((el) =>
            Object.keys(el.parameters || {}).map((key) => key.split('.')[0])
          ) || []
        )
      ),
      sampleParameters: bimElements.allElements.value?.[0]?.parameters || {}
    })

    // Log parameter processing results
    debug.log(DebugCategories.PARAMETERS, 'Parameter processing results', {
      raw: parameterState.raw,
      available: parameterState.available,
      selected: parameterState.selected,
      groups: {
        parent: Array.from(
          new Set(
            parameterStore.parentRawParameters.value?.map((p) => p.sourceGroup) || []
          )
        ),
        child: Array.from(
          new Set(
            parameterStore.childRawParameters.value?.map((p) => p.sourceGroup) || []
          )
        )
      }
    })

    // Log parameter groups for debugging
    const parentGroups = new Set<string>()
    parameterStore.parentRawParameters.value?.forEach((param) => {
      if (param.sourceGroup) parentGroups.add(param.sourceGroup)
    })

    debug.log(DebugCategories.PARAMETERS, 'Parameter groups', {
      parent: Array.from(parentGroups),
      parameterState
    })

    // Log parameter processing state
    debug.log(DebugCategories.PARAMETERS, 'Parameter processing state', {
      parent: {
        raw: parameterStore.parentRawParameters.value?.length || 0,
        available: {
          bim: parameterStore.parentAvailableBimParameters.value?.length || 0,
          user: parameterStore.parentAvailableUserParameters.value?.length || 0
        },
        selected: parameterStore.parentSelectedParameters.value?.length || 0
      },
      child: {
        raw: parameterStore.childRawParameters.value?.length || 0,
        available: {
          bim: parameterStore.childAvailableBimParameters.value?.length || 0,
          user: parameterStore.childAvailableUserParameters.value?.length || 0
        },
        selected: parameterStore.childSelectedParameters.value?.length || 0
      }
    })

    debug.completeState(DebugCategories.INITIALIZATION, 'Element data initialized')

    // Load tables
    debug.startState(DebugCategories.INITIALIZATION, 'Loading tables')
    await tablesState.loadTables()

    const tables = tablesState.state.value?.tables
    if (!tables) {
      throw new Error('Failed to load tables')
    }

    debug.log(DebugCategories.DATA, 'Tables loaded', {
      count: Object.keys(tables).length,
      tableIds: Object.keys(tables)
    })

    // Type-safe table processing
    type TablesType = Record<string, NamedTableConfig>
    const tableEntries = safeObjectEntries<TablesType>(tables as TablesType)
    const validTableEntries = tableEntries.filter(
      (entry): entry is [string, NamedTableConfig] => isValidTable(entry[1])
    )
    const filteredEntries = validTableEntries.filter(
      ([_, table]) => table.id !== 'defaultTable'
    )
    const tablesList = filteredEntries.map(([_, table]) => ({
      id: table.id,
      name: table.name || 'Unnamed Table'
    }))

    // Update store with tables
    await store.lifecycle.update({
      tablesArray: tablesList
    })

    // Select table with type safety
    const lastSelectedId = localStorage.getItem('speckle:lastSelectedTableId')
    const tableIdToSelect =
      lastSelectedId &&
      safeArrayIncludes(
        tablesList.map((t) => t.id),
        lastSelectedId
      )
        ? lastSelectedId
        : tablesList.length > 0
        ? tablesList[0].id
        : 'default'

    // Initialize table component
    await initComponent.update({
      selectedTableId: tableIdToSelect
    })

    debug.completeState(DebugCategories.INITIALIZATION, 'Schedules initialized')
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to initialize schedules', err)
    updateErrorState(createSafeError(err))
  }
})

// Expose necessary functions
defineExpose({
  handleError: (err: unknown) => updateErrorState(createSafeError(err)),
  handleTableDataUpdate,
  handleColumnVisibilityChange
})
</script>

<style scoped>
.viewer-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.schedule-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>
