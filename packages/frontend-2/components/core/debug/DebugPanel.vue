<template>
  <div v-if="debug.isPanelVisible.value" class="debug-panel">
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
            <h5>Parent Parameters ({{ getParentParameterCount() }})</h5>
            <div class="parameter-counts">
              <div class="count-item">
                <span>Raw Fetched:</span>
                <span>{{ parentRawCount }}</span>
              </div>
              <div class="count-item">
                <span>Unique:</span>
                <span>{{ availableParentHeaders?.length }}</span>
              </div>
              <div class="count-item">
                <span>Active:</span>
                <span>{{ getActiveParentParameterCount() }}</span>
              </div>
            </div>
            <div class="parameter-sources">
              <div
                v-for="group in parentParameterGroups"
                :key="group.source"
                class="source-item"
              >
                <span>{{ group.source }}</span>
                <span>{{ group.visibleCount }}/{{ group.totalCount }}</span>
              </div>
            </div>
          </div>

          <!-- Child Parameters -->
          <div class="parameter-group">
            <h5>Child Parameters ({{ getChildParameterCount() }})</h5>
            <div class="parameter-counts">
              <div class="count-item">
                <span>Raw Fetched:</span>
                <span>{{ childRawCount }}</span>
              </div>
              <div class="count-item">
                <span>Unique:</span>
                <span>{{ availableChildHeaders?.length }}</span>
              </div>
              <div class="count-item">
                <span>Active:</span>
                <span>{{ getActiveChildParameterCount() }}</span>
              </div>
            </div>
            <div class="parameter-sources">
              <div
                v-for="group in childParameterGroups"
                :key="group.source"
                class="source-item"
              >
                <span>{{ group.source }}</span>
                <span>{{ group.visibleCount }}/{{ group.totalCount }}</span>
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

  <!-- Toggle Button -->
  <button v-else class="debug-toggle" @click="debug.togglePanel">Debug</button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type { TableRow, ElementData, ColumnDef } from '~/composables/core/types'
import {
  isBimColumnDef,
  isUserColumnDef
} from '~/composables/core/types/tables/column-types'

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

// Parameter Stats
interface ParameterGroup {
  source: string
  parameters: ColumnDef[]
  visibleCount: number
  totalCount: number
  modifiedCount: number
}

function getColumnSource(column: ColumnDef): string {
  if (isBimColumnDef(column)) {
    return column.source || column.fetchedGroup
  }
  if (isUserColumnDef(column)) {
    return column.group
  }
  return 'Unknown'
}

function countModifiedParameters(elements: ElementData[], paramKey: string): number {
  return elements.reduce((count, element) => {
    const paramValue = element.parameters[paramKey]
    if (paramValue !== null && paramValue !== undefined) {
      return count + 1
    }
    return count
  }, 0)
}

const parentParameterGroups = computed<ParameterGroup[]>(() => {
  const groups = new Map<string, ColumnDef[]>()

  if (!props.parentParameterColumns) return []

  props.parentParameterColumns.forEach((col) => {
    const source = getColumnSource(col)
    if (!groups.has(source)) {
      groups.set(source, [])
    }
    groups.get(source)!.push(col)
  })

  return Array.from(groups.entries()).map(([source, columns]) => ({
    source,
    parameters: columns.sort((a, b) => (a.order || 0) - (b.order || 0)),
    visibleCount: columns.filter((c) => c.visible).length,
    totalCount: columns.length,
    modifiedCount: columns.reduce(
      (count, col) =>
        count + countModifiedParameters(props.parentElements || [], col.field),
      0
    )
  }))
})

const childParameterGroups = computed<ParameterGroup[]>(() => {
  const groups = new Map<string, ColumnDef[]>()

  if (!props.childParameterColumns) return []

  props.childParameterColumns.forEach((col) => {
    const source = getColumnSource(col)
    if (!groups.has(source)) {
      groups.set(source, [])
    }
    groups.get(source)!.push(col)
  })

  return Array.from(groups.entries()).map(([source, columns]) => ({
    source,
    parameters: columns.sort((a, b) => (a.order || 0) - (b.order || 0)),
    visibleCount: columns.filter((c) => c.visible).length,
    totalCount: columns.length,
    modifiedCount: columns.reduce(
      (count, col) =>
        count + countModifiedParameters(props.childElements || [], col.field),
      0
    )
  }))
})

function getParentParameterCount(): number {
  return parentParameterGroups.value.reduce(
    (total, group) => total + group.totalCount,
    0
  )
}

function getChildParameterCount(): number {
  return childParameterGroups.value.reduce(
    (total, group) => total + group.totalCount,
    0
  )
}

function getActiveParentParameterCount(): number {
  return parentParameterGroups.value.reduce(
    (total, group) => total + group.visibleCount,
    0
  )
}

function getActiveChildParameterCount(): number {
  return childParameterGroups.value.reduce(
    (total, group) => total + group.visibleCount,
    0
  )
}

const parentRawCount = computed(() => {
  return (props.parentElements || []).reduce((count, element) => {
    return count + Object.keys(element.parameters || {}).length
  }, 0)
})

const childRawCount = computed(() => {
  return (props.childElements || []).reduce((count, element) => {
    return count + Object.keys(element.parameters || {}).length
  }, 0)
})

// Data Structure
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
      raw: parentRawCount.value,
      unique: props.availableParentHeaders?.length || 0,
      active: getActiveParentParameterCount(),
      groups: Object.fromEntries(
        parentParameterGroups.value.map((g) => [
          g.source,
          { visible: g.visibleCount, total: g.totalCount }
        ])
      )
    },
    child: {
      raw: childRawCount.value,
      unique: props.availableChildHeaders?.length || 0,
      active: getActiveChildParameterCount(),
      groups: Object.fromEntries(
        childParameterGroups.value.map((g) => [
          g.source,
          { visible: g.visibleCount, total: g.totalCount }
        ])
      )
    }
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

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString()
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
</style>
