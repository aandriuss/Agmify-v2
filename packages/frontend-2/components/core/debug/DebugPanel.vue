<template>
  <div class="debug-container">
    <template v-if="debug.isPanelVisible.value">
      <div class="debug-panel">
        <div class="debug-header">
          <h3>Debug Panel</h3>
          <div class="debug-controls">
            <button @click="debug.toggleDebug">
              {{ debug.isEnabled.value ? 'Disable' : 'Enable' }} Debug
            </button>
            <button @click="debug.togglePanel">Close</button>
          </div>
        </div>

        <div class="debug-content">
          <!-- Categories -->
          <div class="debug-section">
            <h4>Categories</h4>
            <div class="category-groups">
              <!-- Core -->
              <div class="category-group">
                <div class="group-header">
                  <h5>Core</h5>
                </div>
                <div class="category-list">
                  <div
                    v-for="category in coreCategories"
                    :key="category"
                    class="category-item"
                  >
                    <label class="category-checkbox">
                      <input
                        type="checkbox"
                        :checked="!hiddenCategories.has(category)"
                        :aria-label="`Show ${category} logs`"
                        @change="toggleCategoryVisibility(category)"
                      />
                      <button
                        class="category-btn"
                        :class="{ active: debug.enabledCategories.value.has(category) }"
                        @click="debug.toggleCategory(category)"
                      >
                        {{ category }}
                      </button>
                    </label>
                  </div>
                </div>
              </div>

              <!-- Data -->
              <div class="category-group">
                <div class="group-header">
                  <h5>Data</h5>
                </div>
                <div class="category-list">
                  <div
                    v-for="category in dataCategories"
                    :key="category"
                    class="category-item"
                  >
                    <label class="category-checkbox">
                      <input
                        type="checkbox"
                        :checked="!hiddenCategories.has(category)"
                        @change="toggleCategoryVisibility(category)"
                      />
                      <button
                        class="category-btn"
                        :class="{ active: debug.enabledCategories.value.has(category) }"
                        @click="debug.toggleCategory(category)"
                      >
                        {{ category }}
                      </button>
                    </label>
                  </div>
                </div>
              </div>

              <!-- Table -->
              <div v-if="showTableCategories" class="category-group">
                <div class="group-header">
                  <h5>Table</h5>
                </div>
                <div class="category-list">
                  <div
                    v-for="category in tableCategories"
                    :key="category"
                    class="category-item"
                  >
                    <label class="category-checkbox">
                      <input
                        type="checkbox"
                        :checked="!hiddenCategories.has(category)"
                        @change="toggleCategoryVisibility(category)"
                      />
                      <button
                        class="category-btn"
                        :class="{ active: debug.enabledCategories.value.has(category) }"
                        @click="debug.toggleCategory(category)"
                      >
                        {{ category }}
                      </button>
                    </label>
                  </div>
                </div>
              </div>

              <!-- Parameters -->
              <div v-if="showParameterCategories" class="category-group">
                <div class="group-header">
                  <h5>Parameters</h5>
                </div>
                <div class="category-list">
                  <div
                    v-for="category in parameterCategories"
                    :key="category"
                    class="category-item"
                  >
                    <label class="category-checkbox">
                      <input
                        type="checkbox"
                        :checked="!hiddenCategories.has(category)"
                        @change="toggleCategoryVisibility(category)"
                      />
                      <button
                        class="category-btn"
                        :class="{ active: debug.enabledCategories.value.has(category) }"
                        @click="debug.toggleCategory(category)"
                      >
                        {{ category }}
                      </button>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div class="category-controls">
              <button @click="debug.enableAllCategories">Enable All</button>
              <button @click="debug.disableAllCategories">Disable All</button>
              <button @click="debug.clearLogs">Clear Logs</button>
            </div>
          </div>

          <!-- Schedule Data -->
          <div class="debug-section">
            <h4>Schedule Data</h4>
            <div class="schedule-stats">
              <div class="stat-group">
                <h5>Processed Data</h5>
                <div class="stat-item">
                  <span>Total Elements:</span>
                  <span>{{ tableData?.length || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span>Parent Elements:</span>
                  <span>
                    {{ tableData?.filter((el) => el.metadata?.isParent).length || 0 }}
                  </span>
                </div>
                <div class="stat-item">
                  <span>Child Elements:</span>
                  <span>{{ tableData?.filter((el) => el.isChild).length || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span>With Parameters:</span>
                  <span>{{ elementsWithParameters }}</span>
                </div>
                <div class="stat-item">
                  <span>Parent Columns:</span>
                  <span>{{ parentParameterColumns?.length || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span>Child Columns:</span>
                  <span>{{ childParameterColumns?.length || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span>Matched Children:</span>
                  <span>
                    {{
                      tableData?.filter(
                        (el) => el.isChild && el.host && el.host !== 'No Host'
                      ).length || 0
                    }}
                  </span>
                </div>
                <div class="stat-item">
                  <span>Orphaned Children:</span>
                  <span>
                    {{
                      tableData?.filter(
                        (el) => el.isChild && (!el.host || el.host === 'No Host')
                      ).length || 0
                    }}
                  </span>
                </div>
              </div>

              <!-- Sample Data -->
              <div v-if="tableData?.length" class="stat-group">
                <h5>Sample Row</h5>
                <pre>{{ formatData(tableData[15]) }}</pre>
              </div>
            </div>
          </div>

          <!-- BIM Data -->
          <div v-if="showBimData" class="debug-section">
            <h4>BIM Data</h4>
            <div class="bim-stats">
              <div class="stat-group">
                <h5>Element Counts</h5>
                <div class="stat-item">
                  <span>Raw Elements:</span>
                  <span>{{ scheduleData?.length || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span>Parent Elements:</span>
                  <span>{{ parentElements?.length || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span>Child Elements:</span>
                  <span>{{ childElements?.length || 0 }}</span>
                </div>
              </div>

              <div class="stat-group">
                <h5>Categories</h5>
                <div class="stat-item">
                  <span>Parent Categories:</span>
                  <span>{{ uniqueParentCategories.join(', ') || 'None' }}</span>
                </div>
                <div class="stat-item">
                  <span>Child Categories:</span>
                  <span>{{ uniqueChildCategories.join(', ') || 'None' }}</span>
                </div>
              </div>

              <div class="stat-group">
                <h5>Parameters</h5>
                <div class="stat-item">
                  <span>Elements with Parameters:</span>
                  <span>{{ elementsWithParameters }}</span>
                </div>
                <div class="stat-item">
                  <span>Parent Parameters:</span>
                  <span>{{ parameterStoreCounts.raw }}</span>
                </div>
                <div class="stat-item">
                  <span>Child Parameters:</span>
                  <span>{{ parameterStoreCounts.raw }}</span>
                </div>
              </div>
            </div>

            <!-- Raw Data Sample -->
            <div v-if="scheduleData?.length" class="raw-data-sample">
              <h5>Sample Element</h5>
              <pre>{{ formatData(scheduleData[8]) }}</pre>
            </div>
          </div>

          <!-- Parameter Stats -->
          <div v-if="showParameterStats" class="debug-section">
            <h4>Parameter Stats</h4>
            <div class="parameter-stats">
              <!-- Parent Parameters -->
              <div class="parameter-group">
                <h5>Parent Parameters</h5>
                <div class="parameter-counts">
                  <div class="count-item">
                    <span>Raw:</span>
                    <span>{{ parameterStoreCounts.raw }}</span>
                  </div>
                  <div class="count-item">
                    <span>Available BIM:</span>
                    <span>{{ parameterStoreCounts.parent.availableBim }}</span>
                  </div>
                  <div class="count-item">
                    <span>Available User:</span>
                    <span>{{ parameterStoreCounts.parent.availableUser }}</span>
                  </div>
                  <div class="count-item">
                    <span>Columns:</span>
                    <span>{{ tableStoreCounts.parent.columns }}</span>
                  </div>
                </div>
                <div class="parameter-groups">
                  <div
                    v-for="[group, data] in Object.entries(parameterGroups.parent)"
                    :key="group"
                    class="group-item"
                  >
                    <div class="group-header">
                      <span>{{ group }}</span>
                      <span>{{ data.visible }}/{{ data.total }}</span>
                    </div>
                    <div class="group-parameters">
                      <div
                        v-for="param in data.parameters"
                        :key="param.id"
                        class="parameter-item"
                        :class="{ active: param.visible }"
                      >
                        {{ param.name }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Child Parameters -->
              <div class="parameter-group">
                <h5>Child Parameters</h5>
                <div class="parameter-counts">
                  <div class="count-item">
                    <span>Raw:</span>
                    <span>{{ parameterStoreCounts.raw }}</span>
                  </div>
                  <div class="count-item">
                    <span>Available BIM:</span>
                    <span>{{ parameterStoreCounts.child.availableBim }}</span>
                  </div>
                  <div class="count-item">
                    <span>Available User:</span>
                    <span>{{ parameterStoreCounts.child.availableUser }}</span>
                  </div>
                  <div class="count-item">
                    <span>Columns:</span>
                    <span>{{ tableStoreCounts.child.columns }}</span>
                  </div>
                </div>
                <div class="parameter-groups">
                  <div
                    v-for="[group, data] in Object.entries(parameterGroups.child)"
                    :key="group"
                    class="group-item"
                  >
                    <div class="group-header">
                      <span>{{ group }}</span>
                      <span>{{ data.visible }}/{{ data.total }}</span>
                    </div>
                    <div class="group-parameters">
                      <div
                        v-for="param in data.parameters"
                        :key="param.id"
                        class="parameter-item"
                        :class="{ active: param.visible }"
                      >
                        {{ param.name }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Store States -->
              <div class="parameter-group">
                <h5>Store States</h5>
                <div class="parameter-counts">
                  <!-- Parameter Store -->
                  <div class="count-item">
                    <span>Parameter Store Last Updated:</span>
                    <span>
                      {{ formatTime(metadata.lastUpdated) }}
                    </span>
                  </div>
                  <div class="count-item">
                    <span>Parameter Store Processing:</span>
                    <span>{{ metadata.isProcessing }}</span>
                  </div>
                  <div v-if="metadata.hasError" class="count-item error">
                    <span>Parameter Store Error:</span>
                    <span>Error state detected</span>
                  </div>

                  <!-- Table Store -->
                  <div class="count-item">
                    <span>Table Store Last Updated:</span>
                    <span>
                      {{ formatTime(tableStore.lastUpdated.value || Date.now()) }}
                    </span>
                  </div>
                  <div class="count-item">
                    <span>Current Table ID:</span>
                    <span>
                      {{ tableStore.computed.currentTable.value?.id || 'None' }}
                    </span>
                  </div>
                  <div v-if="tableStore.hasError.value" class="count-item error">
                    <span>Table Store Error:</span>
                    <span>Error state detected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Data Structure -->
          <div v-if="showDataStructure" class="debug-section">
            <h4>Data Structure</h4>
            <pre class="data-structure">{{ formatData(dataStructure) }}</pre>
          </div>

          <!-- Logs -->
          <div class="debug-section">
            <h4>Logs</h4>
            <div class="log-entries">
              <div
                v-for="(log, index) in displayedLogs"
                :key="`${log.timestamp}-${index}`"
                class="log-entry"
                :class="log.level"
              >
                <div class="log-header">
                  <span class="timestamp">{{ formatTime(log.timestamp) }}</span>
                  <span class="category">[{{ log.category }}]</span>
                  <span v-if="log.state" class="state">[{{ log.state }}]</span>
                  <span v-if="log.source" class="source">[{{ log.source }}]</span>
                </div>
                <div class="log-message">{{ log.message }}</div>
                <pre v-if="log.data" class="log-data">{{ formatData(log.data) }}</pre>
                <pre v-if="log.details" class="log-details">{{
                  formatData(log.details)
                }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template v-else>
      <button class="debug-toggle" @click="debug.togglePanel">Debug</button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type { DebugPanelProps } from '~/composables/core/types/debug-panel'
import { useParameterStore } from '~/composables/core/parameters/store/store'
import { useTableStore } from '~/composables/core/tables/store/store'
import type {
  AvailableBimParameter,
  AvailableUserParameter
} from '~/composables/core/types/parameters/parameter-states'

type Props = DebugPanelProps

const props = withDefaults(defineProps<Props>(), {
  showTestMode: false,
  showTableCategories: false,
  showParameterCategories: false,
  showBimData: false,
  showParameterStats: false,
  showDataStructure: false,
  scheduleData: () => [],
  evaluatedData: () => [],
  tableData: () => [],
  parentElements: () => [],
  childElements: () => [],
  parentParameterColumns: () => [],
  childParameterColumns: () => [],
  availableParentHeaders: () => [],
  availableChildHeaders: () => []
})

// Use stores with safe access
const parameters = useParameterStore()
const tableStore = useTableStore()

// Store state checks
const isProcessingComplete = computed(
  () => parameters?.state?.value?.processing?.status === 'complete'
)

// Parameter counts from parameter store with processing check
const parameterStoreCounts = computed(() => ({
  raw: parameters.rawParameters?.value?.length || 0,
  parent: {
    availableBim: isProcessingComplete.value
      ? parameters.parentAvailableBimParameters.value?.length || 0
      : 0,
    availableUser: isProcessingComplete.value
      ? parameters.parentAvailableUserParameters.value?.length || 0
      : 0
  },
  child: {
    availableBim: isProcessingComplete.value
      ? parameters.childAvailableBimParameters.value?.length || 0
      : 0,
    availableUser: isProcessingComplete.value
      ? parameters.childAvailableUserParameters.value?.length || 0
      : 0
  }
}))

// Watch for processing completion but avoid recursive logging
watch(
  isProcessingComplete,
  (complete) => {
    if (complete) {
      // Only log if we have actual parameters
      const counts = parameterStoreCounts.value
      if (
        counts.raw > 0 ||
        counts.parent.availableBim > 0 ||
        counts.child.availableBim > 0
      ) {
        debug.log(DebugCategories.STATE, 'Parameter processing complete', {
          counts
        })
      }
    }
  },
  { immediate: false } // Don't trigger immediately to avoid initial recursion
)

// Selected parameters and columns from table store
const tableStoreCounts = computed(() => {
  const currentTable = tableStore.computed.currentTable.value

  return {
    parent: {
      columns: currentTable?.parentColumns?.length ?? 0
    },
    child: {
      columns: currentTable?.childColumns?.length ?? 0
    }
  }
})

// Initialize parameter system with proper categories
const uniqueParentCategories = computed(() =>
  Array.from(
    new Set(
      props.parentElements?.map((el) => el.category).filter((c): c is string => !!c)
    )
  )
)

const uniqueChildCategories = computed(() =>
  Array.from(
    new Set(
      props.childElements?.map((el) => el.category).filter((c): c is string => !!c)
    )
  )
)

// Safe parameter access helper
const safeValue = <T>(value: { value?: T | null } | undefined | null) => value?.value

interface ParameterCounts {
  parent: {
    availableBim: number
    availableUser: number
    selected: number
    columns: number
  }
  child: {
    availableBim: number
    availableUser: number
    selected: number
    columns: number
  }
}

// Combined counts for backward compatibility
const parameterCounts = computed<ParameterCounts>(() => {
  const storeCounts = parameterStoreCounts.value
  const tableCounts = tableStoreCounts.value

  return {
    parent: {
      availableBim: storeCounts.parent.availableBim,
      availableUser: storeCounts.parent.availableUser,
      selected: 0, // No longer using selected parameters
      columns: tableCounts.parent.columns
    },
    child: {
      availableBim: storeCounts.child.availableBim,
      availableUser: storeCounts.child.availableUser,
      selected: 0, // No longer using selected parameters
      columns: tableCounts.child.columns
    }
  }
})

// Limit displayed logs for performance
const MAX_DISPLAYED_LOGS = 200
const displayedLogs = computed(() =>
  debug.filteredLogs.value
    .filter((log) => !hiddenCategories.value.has(log.category))
    .slice(0, MAX_DISPLAYED_LOGS)
)
// Group categories
const coreCategories = computed(() => [
  DebugCategories.INITIALIZATION,
  DebugCategories.STATE,
  DebugCategories.ERROR
])

const dataCategories = computed(() => [
  DebugCategories.DATA,
  DebugCategories.DATA_TRANSFORM,
  DebugCategories.DATA_VALIDATION,
  DebugCategories.VALIDATION
])

const tableCategories = computed(() => [
  DebugCategories.TABLE_DATA,
  DebugCategories.TABLE_UPDATES,
  DebugCategories.TABLE_VALIDATION,
  DebugCategories.COLUMNS,
  DebugCategories.COLUMN_VALIDATION,
  DebugCategories.COLUMN_UPDATES
])

const parameterCategories = computed(() => [
  DebugCategories.PARAMETERS,
  DebugCategories.PARAMETER_VALIDATION,
  DebugCategories.PARAMETER_UPDATES,
  DebugCategories.CATEGORIES,
  DebugCategories.CATEGORY_UPDATES,
  DebugCategories.RELATIONSHIPS
])

const elementsWithParameters = computed(
  () =>
    props.scheduleData?.filter((el) => Object.keys(el.parameters || {}).length > 0)
      .length || 0
)

// Parameter groups with type safety and processing check
const parameterGroups = computed(() => {
  if (!isProcessingComplete.value) {
    return {
      parent: {},
      child: {}
    }
  }

  return {
    parent: getParameterGroups(
      safeValue(parameters.parentAvailableBimParameters) || [],
      safeValue(parameters.parentAvailableUserParameters) || []
    ),
    child: getParameterGroups(
      safeValue(parameters.childAvailableBimParameters) || [],
      safeValue(parameters.childAvailableUserParameters) || []
    )
  }
})

// Safe metadata access
const metadata = computed(() => ({
  lastUpdated: safeValue(parameters.lastUpdated) || Date.now(),
  isProcessing: safeValue(parameters.isProcessing) || false,
  hasError: safeValue(parameters.hasError) || false
}))

interface ParameterGroupData {
  total: number
  visible: number
  parameters: Array<{
    id: string
    name: string
    visible: boolean
  }>
}

// Visibility tracking with Set
const hiddenCategories = ref(new Set<string>())

function toggleCategoryVisibility(category: string) {
  if (hiddenCategories.value.has(category)) {
    hiddenCategories.value.delete(category)
  } else {
    hiddenCategories.value.add(category)
  }
}

type ParameterGroups = Record<string, ParameterGroupData>

function getParameterGroups(
  bimParams: AvailableBimParameter[],
  userParams: AvailableUserParameter[]
): ParameterGroups {
  const groups = new Map<string, ParameterGroupData>()

  // Process BIM parameters
  for (const param of bimParams) {
    const group = param.group.currentGroup
    if (!groups.has(group)) {
      groups.set(group, {
        total: 0,
        visible: 0,
        parameters: []
      })
    }

    const groupData = groups.get(group)
    if (groupData) {
      groupData.total++
      if (param.visible ?? false) groupData.visible++
      groupData.parameters.push({
        id: param.id,
        name: param.name,
        visible: param.visible ?? false
      })
    }
  }

  // Process user parameters
  for (const param of userParams) {
    const group = param.group
    if (!groups.has(group.currentGroup)) {
      groups.set(group.currentGroup, {
        total: 0,
        visible: 0,
        parameters: []
      })
    }

    const groupData = groups.get(group.currentGroup)
    if (groupData) {
      groupData.total++
      if (param.visible ?? false) groupData.visible++
      groupData.parameters.push({
        id: param.id,
        name: param.name,
        visible: param.visible ?? false
      })
    }
  }

  return Object.fromEntries(groups.entries())
}

// Data structure
const dataStructure = computed<{
  tableState: {
    rowCount: number
    columnCount: number
    parentColumns: number
    childColumns: number
  }
  parameters: {
    // raw: number
    parent: {
      available: {
        bim: number
        user: number
      }
      selected: number
      columns: number
      groups: ParameterGroups
    }
    child: {
      available: {
        bim: number
        user: number
      }
      selected: number
      columns: number
      groups: ParameterGroups
    }
    metadata: {
      lastUpdated: number
      isProcessing: boolean
      hasError: boolean
      error?: boolean // Added to match the type we're using
    }
  }
  sample: unknown | null
}>(() => ({
  tableState: {
    rowCount: props.tableData?.length || 0,
    columnCount:
      (props.parentParameterColumns?.length || 0) +
      (props.childParameterColumns?.length || 0),
    parentColumns: props.parentParameterColumns?.length || 0,
    childColumns: props.childParameterColumns?.length || 0
  },
  parameters: {
    // raw: parameterCounts.value.raw,
    parent: {
      available: {
        bim: parameterCounts.value.parent.availableBim,
        user: parameterCounts.value.parent.availableUser
      },
      selected: parameterCounts.value.parent.selected,
      columns: parameterCounts.value.parent.columns,
      groups: parameterGroups.value.parent
    },
    child: {
      available: {
        bim: parameterCounts.value.child.availableBim,
        user: parameterCounts.value.child.availableUser
      },
      selected: parameterCounts.value.child.selected,
      columns: parameterCounts.value.child.columns,
      groups: parameterGroups.value.child
    },
    metadata: {
      lastUpdated: metadata.value.lastUpdated,
      isProcessing: metadata.value.isProcessing,
      hasError: metadata.value.hasError
    }
  },
  sample: props.tableData?.[5] || null
}))

function formatTime(timestamp: string | number): string {
  const date =
    typeof timestamp === 'string' ? new Date(timestamp) : new Date(Number(timestamp))
  return date.toLocaleTimeString()
}

function formatData(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}
</script>

<style scoped>
.debug-container {
  position: relative;
  z-index: 9999;
}

.debug-panel {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 600px;
  background: #1e1e1e;
  color: #fff;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  font-family: monospace;
  font-size: 12px;
  border-left: 1px solid #3d3d3d;
}

.debug-header {
  padding: 8px;
  background: #2d2d2d;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #3d3d3d;
}

.debug-controls {
  display: flex;
  gap: 8px;
}

.debug-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.debug-section {
  margin-bottom: 16px;
  padding: 8px;
  background: #2d2d2d;
  border-radius: 4px;
}

.debug-section h4 {
  margin: 0 0 8px;
  color: #888;
  font-size: 14px;
}

.category-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.group-header h5 {
  margin: 0;
  color: #888;
  font-size: 11px;
}

.group-toggle {
  padding: 2px 6px;
  font-size: 10px;
  background: #444;
}

.group-toggle:hover {
  background: #555;
}

.category-toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.category-toggles button {
  padding: 2px 6px;
  border-radius: 4px;
  background: #3d3d3d;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 11px;
}

.category-toggles button.active {
  background: #0078d4;
}

.category-controls {
  display: flex;
  gap: 8px;
}

.parameter-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.parameter-group {
  background: #2d2d2d;
  padding: 8px;
  border-radius: 4px;
}

.parameter-group h5 {
  margin: 0 0 8px;
  color: #888;
  font-size: 12px;
}

.parameter-counts {
  margin-bottom: 8px;
}

.count-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.parameter-sources {
  background: #1e1e1e;
  padding: 4px;
  border-radius: 4px;
}

.source-item {
  display: flex;
  justify-content: space-between;
  padding: 2px 4px;
}

.data-structure {
  background: #1e1e1e;
  padding: 8px;
  border-radius: 4px;
  overflow: auto;
  max-height: 300px;
}

.log-entries {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-entry {
  padding: 4px;
  border-radius: 4px;
  background: #2d2d2d;
}

.log-entry.warn {
  background: #320;
}

.log-entry.error {
  background: #300;
}

.log-header {
  display: flex;
  gap: 8px;
  color: #888;
  margin-bottom: 4px;
  font-size: 11px;
}

.log-message {
  white-space: pre-wrap;
}

.log-data,
.log-details {
  margin-top: 4px;
  padding: 4px;
  background: #1e1e1e;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 11px;
}

.debug-toggle {
  position: fixed;
  right: 8px;
  bottom: 8px;
  z-index: 9999;
  padding: 4px 8px;
  background: #1e1e1e;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: monospace;
  font-size: 12px;
}

button {
  padding: 4px 8px;
  border-radius: 4px;
  background: #3d3d3d;
  border: none;
  color: #fff;
  cursor: pointer;
}

button:hover {
  background: #4d4d4d;
}

/* BIM Data Styles */
.bim-stats {
  display: grid;
  gap: 16px;
  margin-bottom: 16px;
}

.stat-group {
  background: #1e1e1e;
  padding: 8px;
  border-radius: 4px;
  margin-top: 8px;
}

.stat-group h5 {
  margin: 0 0 8px;
  color: #888;
  font-size: 12px;
}

.stat-group pre {
  font-size: 11px;
  margin: 0;
  overflow: auto;
  max-height: 200px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 11px;
}

.raw-data-sample {
  background: #1e1e1e;
  padding: 8px;
  border-radius: 4px;
  margin-top: 8px;
}

.raw-data-sample h5 {
  margin: 0 0 8px;
  color: #888;
  font-size: 12px;
}

.raw-data-sample pre {
  font-size: 11px;
  margin: 0;
  overflow: auto;
  max-height: 200px;
}

.parameter-groups {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-item {
  background: #1e1e1e;
  padding: 4px;
  border-radius: 4px;
}

.group-parameters {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 0 4px;
}

.parameter-item {
  font-size: 10px;
  padding: 1px 4px;
  background: #3d3d3d;
  border-radius: 2px;
  opacity: 0.5;
}

.parameter-item.active {
  opacity: 1;
  background: #0078d4;
}

.visibility-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.visibility-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: #1e1e1e;
  border-radius: 4px;
  margin-bottom: 8px;
}

.visibility-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  cursor: pointer;
  font-size: 11px;
  padding: 2px 4px;
}

.visibility-checkbox:hover {
  background: #2d2d2d;
  border-radius: 4px;
}

.visibility-checkbox input[type='checkbox'] {
  margin: 0;
  cursor: pointer;
}

.category-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: #1e1e1e;
  border-radius: 4px;
  margin-top: 4px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-btn {
  flex: 1;
  text-align: left;
  padding: 2px 6px;
  border-radius: 4px;
  background: #3d3d3d;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 11px;
}

.category-btn:hover {
  background: #4d4d4d;
}

.category-btn.active {
  background: #0078d4;
}

.category-item input[type='checkbox'] {
  margin: 0;
  cursor: pointer;
}

.group-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #888;
  cursor: pointer;
  font-size: 11px;
}
</style>
