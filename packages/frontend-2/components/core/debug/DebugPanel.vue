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
          <!-- Test Mode Toggle -->
          <div v-if="showTestMode" class="debug-section">
            <h4>Test Mode</h4>
            <FormButton text size="sm" color="subtle" @click="toggleTestMode">
              {{ isTestMode ? 'Show Real Data' : 'Show Test Data' }}
            </FormButton>
          </div>

          <!-- Categories -->
          <div class="debug-section">
            <h4>Categories</h4>
            <div class="category-groups">
              <!-- Core -->
              <div class="category-group">
                <h5>Core</h5>
                <div class="category-toggles">
                  <button
                    v-for="category in coreCategories"
                    :key="category"
                    :class="{ active: debug.enabledCategories.value.has(category) }"
                    @click="debug.toggleCategory(category)"
                  >
                    {{ category }}
                  </button>
                </div>
              </div>

              <!-- Data -->
              <div class="category-group">
                <h5>Data</h5>
                <div class="category-toggles">
                  <button
                    v-for="category in dataCategories"
                    :key="category"
                    :class="{ active: debug.enabledCategories.value.has(category) }"
                    @click="debug.toggleCategory(category)"
                  >
                    {{ category }}
                  </button>
                </div>
              </div>

              <!-- Table -->
              <div v-if="showTableCategories" class="category-group">
                <h5>Table</h5>
                <div class="category-toggles">
                  <button
                    v-for="category in tableCategories"
                    :key="category"
                    :class="{ active: debug.enabledCategories.value.has(category) }"
                    @click="debug.toggleCategory(category)"
                  >
                    {{ category }}
                  </button>
                </div>
              </div>

              <!-- Parameters -->
              <div v-if="showParameterCategories" class="category-group">
                <h5>Parameters</h5>
                <div class="category-toggles">
                  <button
                    v-for="category in parameterCategories"
                    :key="category"
                    :class="{ active: debug.enabledCategories.value.has(category) }"
                    @click="debug.toggleCategory(category)"
                  >
                    {{ category }}
                  </button>
                </div>
              </div>
            </div>

            <div class="category-controls">
              <button @click="debug.enableAllCategories">Enable All</button>
              <button @click="debug.disableAllCategories">Disable All</button>
              <button @click="debug.clearLogs">Clear Logs</button>
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
                  <span>{{ parentParameterColumns?.length || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span>Child Parameters:</span>
                  <span>{{ childParameterColumns?.length || 0 }}</span>
                </div>
              </div>
            </div>

            <!-- Raw Data Sample -->
            <div v-if="scheduleData?.length" class="raw-data-sample">
              <h5>Sample Element</h5>
              <pre>{{ formatData(scheduleData[0]) }}</pre>
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
                    <span>{{ parameterStoreStats.parent.raw }}</span>
                  </div>
                  <div class="count-item">
                    <span>Available BIM:</span>
                    <span>{{ parameterStoreStats.parent.available.bim }}</span>
                  </div>
                  <div class="count-item">
                    <span>Available User:</span>
                    <span>{{ parameterStoreStats.parent.available.user }}</span>
                  </div>
                  <div class="count-item">
                    <span>Selected:</span>
                    <span>{{ parameterStoreStats.parent.selected }}</span>
                  </div>
                  <div class="count-item">
                    <span>Columns:</span>
                    <span>{{ parameterStoreStats.parent.columns }}</span>
                  </div>
                </div>
                <div class="parameter-groups">
                  <div
                    v-for="[group, data] in Object.entries(
                      parameterStoreStats.parent.groups
                    )"
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
                    <span>{{ parameterStoreStats.child.raw }}</span>
                  </div>
                  <div class="count-item">
                    <span>Available BIM:</span>
                    <span>{{ parameterStoreStats.child.available.bim }}</span>
                  </div>
                  <div class="count-item">
                    <span>Available User:</span>
                    <span>{{ parameterStoreStats.child.available.user }}</span>
                  </div>
                  <div class="count-item">
                    <span>Selected:</span>
                    <span>{{ parameterStoreStats.child.selected }}</span>
                  </div>
                  <div class="count-item">
                    <span>Columns:</span>
                    <span>{{ parameterStoreStats.child.columns }}</span>
                  </div>
                </div>
                <div class="parameter-groups">
                  <div
                    v-for="[group, data] in Object.entries(
                      parameterStoreStats.child.groups
                    )"
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

              <!-- Parameter Store Metadata -->
              <div class="parameter-group">
                <h5>Parameter Store State</h5>
                <div class="parameter-counts">
                  <div class="count-item">
                    <span>Last Updated:</span>
                    <span>
                      {{ formatTime(parameterStoreStats.metadata.lastUpdated) }}
                    </span>
                  </div>
                  <div class="count-item">
                    <span>Processing:</span>
                    <span>{{ parameterStoreStats.metadata.isProcessing }}</span>
                  </div>
                  <div
                    v-if="parameterStoreStats.metadata.error"
                    class="count-item error"
                  >
                    <span>Error:</span>
                    <span>{{ parameterStoreStats.metadata.error.message }}</span>
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
                v-for="log in displayedLogs"
                :key="log.timestamp"
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
import { computed } from 'vue'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type { TableRow, ElementData, ColumnDef } from '~/composables/core/types'
import { useParameterStore } from '~/composables/core/parameters/store'
import type {
  AvailableBimParameter,
  AvailableUserParameter
} from '@/composables/core/parameters/store/types'

interface Props {
  // Core props
  showTestMode?: boolean
  showTableCategories?: boolean
  showParameterCategories?: boolean
  showBimData?: boolean
  showParameterStats?: boolean
  showDataStructure?: boolean
  isTestMode?: boolean

  // Data props (optional, only needed for specific sections)
  scheduleData?: ElementData[]
  evaluatedData?: ElementData[]
  tableData?: TableRow[]
  parentElements?: ElementData[]
  childElements?: ElementData[]
  parentParameterColumns?: ColumnDef[]
  childParameterColumns?: ColumnDef[]
  availableParentHeaders?: ColumnDef[]
  availableChildHeaders?: ColumnDef[]
}

const emit = defineEmits<{
  'update:isTestMode': [value: boolean]
}>()

const props = withDefaults(defineProps<Props>(), {
  showTestMode: false,
  showTableCategories: false,
  showParameterCategories: false,
  showBimData: false,
  showParameterStats: false,
  showDataStructure: false,
  isTestMode: false,
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

// Limit displayed logs for performance
const MAX_DISPLAYED_LOGS = 100
const displayedLogs = computed(() =>
  debug.filteredLogs.value.slice(0, MAX_DISPLAYED_LOGS)
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

// BIM Data Stats
const uniqueParentCategories = computed(() => [
  ...new Set(props.parentElements?.map((el) => el.category) || [])
])

const uniqueChildCategories = computed(() => [
  ...new Set(props.childElements?.map((el) => el.category) || [])
])

const elementsWithParameters = computed(
  () =>
    props.scheduleData?.filter((el) => Object.keys(el.parameters || {}).length > 0)
      .length || 0
)

const parameterStore = useParameterStore()

// Parameter Store Stats
const parameterStoreStats = computed(() => ({
  parent: {
    raw: parameterStore.parentRawParameters.value.length,
    available: {
      bim: parameterStore.parentAvailableBimParameters.value.length,
      user: parameterStore.parentAvailableUserParameters.value.length
    },
    selected: parameterStore.parentSelectedParameters.value.length,
    columns: parameterStore.parentColumnDefinitions.value.length,
    groups: getParameterGroups(
      parameterStore.parentAvailableBimParameters.value,
      parameterStore.parentAvailableUserParameters.value
    )
  },
  child: {
    raw: parameterStore.childRawParameters.value.length,
    available: {
      bim: parameterStore.childAvailableBimParameters.value.length,
      user: parameterStore.childAvailableUserParameters.value.length
    },
    selected: parameterStore.childSelectedParameters.value.length,
    columns: parameterStore.childColumnDefinitions.value.length,
    groups: getParameterGroups(
      parameterStore.childAvailableBimParameters.value,
      parameterStore.childAvailableUserParameters.value
    )
  },
  metadata: {
    lastUpdated: parameterStore.state.value.lastUpdated,
    isProcessing: parameterStore.state.value.isProcessing,
    error: parameterStore.state.value.error
  }
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

type ParameterGroups = Record<string, ParameterGroupData>

function getParameterGroups(
  bimParams: AvailableBimParameter[],
  userParams: AvailableUserParameter[]
): ParameterGroups {
  const groups = new Map<string, ParameterGroupData>()

  // Process BIM parameters
  for (const param of bimParams) {
    const group = param.currentGroup
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
      groupData.parameters.push({
        id: param.id,
        name: param.name,
        visible: true // BIM parameters are always visible in available state
      })
    }
  }

  // Process user parameters
  for (const param of userParams) {
    const group = param.group
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
      groupData.parameters.push({
        id: param.id,
        name: param.name,
        visible: true // User parameters are always visible in available state
      })
    }
  }

  return Object.fromEntries(groups.entries())
}

// Update data structure to include parameter store stats
const dataStructure = computed(() => ({
  tableState: {
    rowCount: props.tableData?.length || 0,
    columnCount:
      (props.parentParameterColumns?.length || 0) +
      (props.childParameterColumns?.length || 0),
    parentColumns: props.parentParameterColumns?.length || 0,
    childColumns: props.childParameterColumns?.length || 0
  },
  parameters: {
    parent: {
      raw: parameterStoreStats.value.parent.raw,
      available: parameterStoreStats.value.parent.available,
      selected: parameterStoreStats.value.parent.selected,
      columns: parameterStoreStats.value.parent.columns,
      groups: parameterStoreStats.value.parent.groups
    },
    child: {
      raw: parameterStoreStats.value.child.raw,
      available: parameterStoreStats.value.child.available,
      selected: parameterStoreStats.value.child.selected,
      columns: parameterStoreStats.value.child.columns,
      groups: parameterStoreStats.value.child.groups
    },
    metadata: parameterStoreStats.value.metadata
  },
  sample: props.tableData?.[0]
    ? {
        id: props.tableData[0].id,
        mark: props.tableData[0].mark,
        category: props.tableData[0].category,
        parameterCount: Object.keys(props.tableData[0].parameters || {}).length,
        parameters: props.tableData[0].parameters
      }
    : null
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

function toggleTestMode() {
  emit('update:isTestMode', !props.isTestMode)
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

.category-group h5 {
  margin: 0 0 4px;
  color: #888;
  font-size: 11px;
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
}

.stat-group h5 {
  margin: 0 0 8px;
  color: #888;
  font-size: 12px;
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

.group-header {
  display: flex;
  justify-content: space-between;
  padding: 2px 4px;
  background: #2d2d2d;
  border-radius: 2px;
  margin-bottom: 4px;
  font-size: 11px;
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
</style>
