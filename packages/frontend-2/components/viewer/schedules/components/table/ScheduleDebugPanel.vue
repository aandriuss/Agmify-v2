<template>
  <div
    class="debug-panel transition-all duration-300"
    :class="{
      'h-12 overflow-hidden': !isVisible,
      'h-auto': isVisible
    }"
  >
    <div class="p-4 bg-gray-100 border-b">
      <div class="flex justify-between items-center mb-2">
        <div class="flex items-center gap-2">
          <h3 class="font-medium">Debug Panel</h3>
          <kbd class="px-2 py-1 text-xs bg-gray-200 rounded">⌘ + D</kbd>
        </div>
        <div class="flex items-center gap-2">
          <label class="sr-only" for="debugFilter">Filter debug data</label>
          <input
            v-if="isVisible"
            id="debugFilter"
            v-model="filterModel"
            type="text"
            placeholder="Filter data..."
            class="px-2 py-1 text-sm border rounded"
          />
          <button
            class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-1"
            @click="toggle"
          >
            <span v-if="!isVisible" class="i-mdi-chevron-down" />
            <span v-else class="i-mdi-chevron-up" />
            {{ isVisible ? 'Hide' : 'Show' }}
          </button>
        </div>
      </div>
      <div v-if="isVisible" class="text-xs text-gray-500">
        <!-- Parameter Stats -->
        <div class="space-y-2">
          <h4 class="font-medium">Parameter Stats:</h4>
          <div class="grid grid-cols-2 gap-4">
            <!-- Parent Element Parameters -->
            <div class="bg-white p-3 rounded shadow-sm">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-gray-600">Parent Parameters</span>
                <span class="font-medium">{{ getParentParameterCount() }}</span>
              </div>
              <div class="text-xs text-gray-500">
                <div class="flex justify-between mb-1">
                  <span>Raw Fetched:</span>
                  <span class="font-medium">{{ parentRawCount }}</span>
                </div>
                <div class="flex justify-between mb-1">
                  <span>Unique:</span>
                  <span class="font-medium">{{ availableParentHeaders.length }}</span>
                </div>
                <div class="flex justify-between mb-1">
                  <span>Active:</span>
                  <span class="font-medium">{{ getActiveParentParameterCount() }}</span>
                </div>
                <div class="mt-2 space-y-2">
                  <div
                    v-for="group in parentParameterGroups"
                    :key="group.source"
                    class="bg-gray-50 p-2 rounded"
                  >
                    <div class="flex justify-between items-center">
                      <span class="font-medium text-gray-700">
                        {{ group.source }}
                      </span>
                      <span class="text-xs bg-white px-2 py-1 rounded">
                        {{ group.visibleCount }}/{{ group.totalCount }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Child Element Parameters -->
            <div class="bg-white p-3 rounded shadow-sm">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-gray-600">Child Parameters</span>
                <span class="font-medium">{{ getChildParameterCount() }}</span>
              </div>
              <div class="text-xs text-gray-500">
                <div class="flex justify-between mb-1">
                  <span>Raw Fetched:</span>
                  <span class="font-medium">{{ childRawCount }}</span>
                </div>
                <div class="flex justify-between mb-1">
                  <span>Unique:</span>
                  <span class="font-medium">{{ availableChildHeaders.length }}</span>
                </div>
                <div class="flex justify-between mb-1">
                  <span>Active:</span>
                  <span class="font-medium">{{ getActiveChildParameterCount() }}</span>
                </div>
                <div class="mt-2 space-y-2">
                  <div
                    v-for="group in childParameterGroups"
                    :key="group.source"
                    class="bg-gray-50 p-2 rounded"
                  >
                    <div class="flex justify-between items-center">
                      <span class="font-medium text-gray-700">
                        {{ group.source }}
                      </span>
                      <span class="text-xs bg-white px-2 py-1 rounded">
                        {{ group.visibleCount }}/{{ group.totalCount }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- DataTable Data -->
        <div class="mt-4 space-y-2">
          <h4 class="font-medium">DataTable Data:</h4>
          <div class="bg-white p-3 rounded shadow-sm">
            <div class="text-xs text-gray-500">
              <div class="flex justify-between mb-1">
                <span>Table Data Rows:</span>
                <span class="font-medium">{{ tableData.length }}</span>
              </div>
              <div class="flex justify-between mb-1">
                <span>Schedule Data Elements:</span>
                <span class="font-medium">{{ scheduleData.length }}</span>
              </div>
              <div class="flex justify-between mb-1">
                <span>Evaluated Data Elements:</span>
                <span class="font-medium">{{ evaluatedData.length }}</span>
              </div>
              <div class="flex justify-between mb-1">
                <span>Parent Parameter Columns:</span>
                <span class="font-medium">{{ parentParameterColumns.length }}</span>
              </div>
              <div class="flex justify-between mb-1">
                <span>Child Parameter Columns:</span>
                <span class="font-medium">{{ childParameterColumns.length }}</span>
              </div>

              <!-- New section for raw data view -->
              <div class="mt-4">
                <h5 class="font-medium mb-2">Data Structure:</h5>
                <pre class="bg-gray-50 p-2 rounded overflow-auto max-h-40">
                  <code>
                    {
                      "tableState": {
                        "rowCount": {{ tableData.length }},
                        "columnCount": {{ parentParameterColumns.length + childParameterColumns.length }},
                        "parentColumns": {{ parentParameterColumns.length }},
                        "childColumns": {{ childParameterColumns.length }}
                      },
                      "parameters": {
                        "parent": {
                          "raw": {{ parentRawCount }},
                          "unique": {{ availableParentHeaders.length }},
                          "active": {{ getActiveParentParameterCount() }},
                          "groups": {{ parentGroupsString }}
                        },
                        "child": {
                          "raw": {{ childRawCount }},
                          "unique": {{ availableChildHeaders.length }},
                          "active": {{ getActiveChildParameterCount() }},
                          "groups": {{ childGroupsString }}
                        }
                      },
                      "sample": {{ sampleString }}
                    }
                  </code>
                </pre>
              </div>

              <!-- Pipeline Overview -->
              <div class="mt-4">
                <h5 class="font-medium mb-2">Data Pipeline:</h5>
                <div class="bg-gray-50 p-2 rounded text-xs">
                  <div class="flex items-center gap-2">
                    <span class="font-medium">Raw Elements</span>
                    <span class="text-gray-400">→</span>
                    <span>{{ scheduleData.length }} items</span>
                  </div>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="font-medium">Evaluated Data</span>
                    <span class="text-gray-400">→</span>
                    <span>{{ evaluatedData.length }} items</span>
                  </div>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="font-medium">Table Data</span>
                    <span class="text-gray-400">→</span>
                    <span>{{ tableData.length }} rows</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { TableRow, ElementData, ParameterValueState } from '../../types'
import { debug, DebugCategories } from '../../utils/debug'
import type { ColumnDef } from '../../../components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '../../../../../composables/useUserSettings'

interface ParameterGroup {
  source: string
  parameters: ColumnDef[]
  visibleCount: number
  totalCount: number
  modifiedCount: number
}

interface Props {
  scheduleData: ElementData[]
  evaluatedData: ElementData[]
  tableData: TableRow[]
  debugFilter: string
  selectedParentCategories: string[]
  selectedChildCategories: string[]
  parentElements: ElementData[]
  childElements: ElementData[]
  matchedElements: ElementData[]
  orphanedElements: ElementData[]
  parentParameterColumns: ColumnDef[]
  childParameterColumns: ColumnDef[]
  availableParentHeaders: ColumnDef[]
  availableChildHeaders: ColumnDef[]
  availableParentParameters: CustomParameter[]
  availableChildParameters: CustomParameter[]
  isVisible: boolean
}

const props = withDefaults(defineProps<Props>(), {
  scheduleData: () => [],
  evaluatedData: () => [],
  tableData: () => [],
  debugFilter: '',
  selectedParentCategories: () => [],
  selectedChildCategories: () => [],
  parentElements: () => [],
  childElements: () => [],
  matchedElements: () => [],
  orphanedElements: () => [],
  parentParameterColumns: () => [],
  childParameterColumns: () => [],
  availableParentHeaders: () => [],
  availableChildHeaders: () => [],
  availableParentParameters: () => [],
  availableChildParameters: () => [],
  isVisible: false
})

const emit = defineEmits<{
  toggle: []
}>()

const filterModel = computed({
  get: () => props.debugFilter,
  set: (value: string) => {
    debug.log(DebugCategories.DEBUG, 'Debug filter updated:', { value })
  }
})

// Helper function to count modified parameters
function countModifiedParameters(elements: ElementData[], paramKey: string): number {
  return elements.reduce((count, element) => {
    const paramValue = element.parameters[paramKey]
    if (paramValue !== null && paramValue !== undefined) {
      return count + 1
    }
    return count
  }, 0)
}

// Computed properties for grouped parameters with null checks and modification tracking
const parentParameterGroups = computed<ParameterGroup[]>(() => {
  const groups = new Map<string, ColumnDef[]>()

  if (!props.parentParameterColumns) return []

  props.parentParameterColumns.forEach((col) => {
    const source = col.source || 'Parameters'
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
      (count, col) => count + countModifiedParameters(props.parentElements, col.field),
      0
    )
  }))
})

const childParameterGroups = computed<ParameterGroup[]>(() => {
  const groups = new Map<string, ColumnDef[]>()

  if (!props.childParameterColumns) return []

  props.childParameterColumns.forEach((col) => {
    const source = col.source || 'Parameters'
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
      (count, col) => count + countModifiedParameters(props.childElements, col.field),
      0
    )
  }))
})

// Update parameter count functions with null checks
function getParentParameterCount(): number {
  return (
    parentParameterGroups.value?.reduce(
      (total, group) => total + (group?.totalCount || 0),
      0
    ) || 0
  )
}

function getChildParameterCount(): number {
  return (
    childParameterGroups.value?.reduce(
      (total, group) => total + (group?.totalCount || 0),
      0
    ) || 0
  )
}

function getActiveParentParameterCount(): number {
  return (
    parentParameterGroups.value?.reduce(
      (total, group) => total + (group?.visibleCount || 0),
      0
    ) || 0
  )
}

function getActiveChildParameterCount(): number {
  return (
    childParameterGroups.value?.reduce(
      (total, group) => total + (group?.visibleCount || 0),
      0
    ) || 0
  )
}

// Computed properties for raw counts
const parentRawCount = computed(() => {
  return props.parentElements.reduce((count, element) => {
    return count + Object.keys(element.parameters || {}).length
  }, 0)
})

const childRawCount = computed(() => {
  return props.childElements.reduce((count, element) => {
    return count + Object.keys(element.parameters || {}).length
  }, 0)
})

// Add these computed properties
const parentGroupsString = computed(() => {
  const groups = Object.fromEntries(
    parentParameterGroups.value.map((g) => [
      g.source,
      { visible: g.visibleCount, total: g.totalCount }
    ])
  )
  return JSON.stringify(groups, null, 2)
})

const childGroupsString = computed(() => {
  const groups = Object.fromEntries(
    childParameterGroups.value.map((g) => [
      g.source,
      { visible: g.visibleCount, total: g.totalCount }
    ])
  )
  return JSON.stringify(groups, null, 2)
})

const sampleString = computed(() => {
  if (!props.tableData.length || !props.tableData[0]) return '"No data"'

  const row = props.tableData[0]
  return JSON.stringify(
    {
      id: row.id,
      mark: row.mark,
      category: row.category,
      parameterCount: Object.keys(row.parameters).length,
      parameters: row.parameters
    },
    null,
    2
  )
})

// Enhanced debug logging with null checks
watch(
  [
    () => parentParameterGroups.value,
    () => childParameterGroups.value,
    () => props.availableParentHeaders,
    () => props.availableChildHeaders
  ],
  () => {
    debug.log(DebugCategories.DATA, 'Parameter state:', {
      parent: {
        available: props.availableParentHeaders?.length || 0,
        active: getActiveParentParameterCount(),
        groups: Object.fromEntries(
          (parentParameterGroups.value || []).map((group) => [
            group.source,
            { total: group.totalCount, visible: group.visibleCount }
          ])
        )
      },
      child: {
        available: props.availableChildHeaders?.length || 0,
        active: getActiveChildParameterCount(),
        groups: Object.fromEntries(
          (childParameterGroups.value || []).map((group) => [
            group.source,
            { total: group.totalCount, visible: group.visibleCount }
          ])
        )
      }
    })
  },
  { immediate: true }
)

const toggle = () => {
  emit('toggle')
}
</script>

<style scoped>
.debug-panel {
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  position: fixed;
  top: 0;
  right: 0;
  width: 100%;
  max-width: 600px;
  z-index: 50;
}

.debug-panel .bg-gray-100 {
  background-color: #f3f4f6;
}

.debug-panel .bg-gray-200 {
  background-color: #e5e7eb;
}

.debug-panel .bg-blue-500 {
  background-color: #3b82f6;
}

.debug-panel .bg-blue-600 {
  background-color: #2563eb;
}

.debug-panel .bg-green-500 {
  background-color: #10b981;
}

.debug-panel .bg-red-500 {
  background-color: #ef4444;
}

.debug-panel .bg-white {
  background-color: #fff;
}

.debug-panel .border {
  border: 1px solid #d1d5db;
}

.debug-panel .border-b {
  border-bottom: 1px solid #d1d5db;
}

.debug-panel .rounded {
  border-radius: 0.375rem;
}

.debug-panel .rounded-full {
  border-radius: 9999px;
}

.debug-panel .shadow-sm {
  box-shadow: 0 1px 2px 0 rgba(0 0 0 / 5%);
}

.debug-panel .shadow-inner {
  box-shadow: inset 0 2px 4px 0 rgba(0 0 0 / 5%);
}

.debug-panel .text-xs {
  font-size: 0.75rem;
}

.debug-panel .text-sm {
  font-size: 0.875rem;
}

.debug-panel .text-gray-500 {
  color: #6b7280;
}

.debug-panel .text-gray-600 {
  color: #4b5563;
}

.debug-panel .text-gray-200 {
  color: #e5e7eb;
}

.debug-panel .text-blue-600 {
  color: #2563eb;
}

.debug-panel .text-green-600 {
  color: #10b981;
}

.debug-panel .text-red-600 {
  color: #ef4444;
}

.debug-panel .font-medium {
  font-weight: 500;
}

.debug-panel .transition-all {
  transition: all 0.3s ease;
}

.debug-panel .duration-300 {
  transition-duration: 300ms;
}

.debug-panel .overflow-hidden {
  overflow: hidden;
}

.debug-panel .h-12 {
  height: 3rem;
}

.debug-panel .h-auto {
  height: auto;
}

.debug-panel .max-h-60 {
  max-height: 15rem;
}

.debug-panel .p-4 {
  padding: 1rem;
}

.debug-panel .p-3 {
  padding: 0.75rem;
}

.debug-panel .px-2 {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.debug-panel .px-3 {
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}

.debug-panel .py-1 {
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}

.debug-panel .ml-1 {
  margin-left: 0.25rem;
}

.debug-panel .ml-2 {
  margin-left: 0.5rem;
}

.debug-panel .ml-4 {
  margin-left: 1rem;
}

.debug-panel .mt-2 {
  margin-top: 0.5rem;
}

.debug-panel .mt-4 {
  margin-top: 1rem;
}

.debug-panel .mb-1 {
  margin-bottom: 0.25rem;
}

.debug-panel .mb-2 {
  margin-bottom: 0.5rem;
}

.debug-panel .mb-4 {
  margin-bottom: 1rem;
}

.debug-panel .gap-1 {
  gap: 0.25rem;
}

.debug-panel .gap-2 {
  gap: 0.5rem;
}

.debug-panel .space-y-1 > :not([hidden]) ~ :not([hidden]) {
  --tw-space-y-reverse: 0;

  margin-top: calc(0.25rem * calc(1 - var(--tw-space-y-reverse)));
  margin-bottom: calc(0.25rem * var(--tw-space-y-reverse));
}

.debug-panel .space-y-2 > :not([hidden]) ~ :not([hidden]) {
  --tw-space-y-reverse: 0;

  margin-top: calc(0.5rem * calc(1 - var(--tw-space-y-reverse)));
  margin-bottom: calc(0.5rem * var(--tw-space-y-reverse));
}

.debug-panel .space-y-4 > :not([hidden]) ~ :not([hidden]) {
  --tw-space-y-reverse: 0;

  margin-top: calc(1rem * calc(1 - var(--tw-space-y-reverse)));
  margin-bottom: calc(1rem * var(--tw-space-y-reverse));
}

.debug-panel .grid {
  display: grid;
}

.debug-panel .grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.debug-panel .flex {
  display: flex;
}

.debug-panel .justify-between {
  justify-content: space-between;
}

.debug-panel .items-center {
  align-items: center;
}

.debug-panel pre {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  line-height: 1.25;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
