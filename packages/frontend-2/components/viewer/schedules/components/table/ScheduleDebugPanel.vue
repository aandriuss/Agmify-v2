<template>
  <div
    class="debug-panel transition-all duration-300"
    :class="{
      'h-12 overflow-hidden': !showRawData,
      'h-auto': showRawData
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
            v-if="showRawData"
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
            <span v-if="!showRawData" class="i-mdi-chevron-down" />
            <span v-else class="i-mdi-chevron-up" />
            {{ showRawData ? 'Hide' : 'Show' }}
          </button>
        </div>
      </div>
      <!-- Table Data List -->
      <div class="space-y-2">
        <div class="flex justify-between items-center">
          <h4 class="font-medium">Table Data:</h4>
          <div class="flex items-center gap-2">
            <div class="relative">
              <label for="tableDataFilter" class="sr-only">Filter table data</label>
              <input
                id="tableDataFilter"
                v-model="tableDataFilter"
                type="text"
                placeholder="Filter table data..."
                class="px-2 py-1 text-xs border rounded"
              />
            </div>
            <div class="relative">
              <label for="tableDataSort" class="sr-only">Sort table data</label>
              <select
                id="tableDataSort"
                v-model="tableDataSort"
                class="text-xs border rounded px-1 py-1"
              >
                <option value="category">Sort by Category</option>
                <option value="type">Sort by Type</option>
                <option value="details">Sort by Details Count</option>
              </select>
            </div>
          </div>
        </div>
        <div class="bg-white p-3 rounded shadow-sm max-h-60 overflow-auto">
          <div v-for="row in filteredSortedTableData" :key="row.id" class="mb-4">
            <!-- Basic Info -->
            <div class="flex items-center gap-2 mb-2">
              <span
                class="w-2 h-2 rounded-full"
                :class="row.details?.length ? 'bg-green-500' : 'bg-gray-500'"
                :title="row.details?.length ? 'Has details' : 'No details'"
              ></span>
              <span class="text-sm font-medium">
                {{ row.type || 'Unknown' }} ({{ row.category }})
              </span>
            </div>

            <!-- Basic Parameters -->
            <div class="ml-4 mb-2">
              <div class="text-xs font-medium text-gray-500 mb-1">
                Basic Parameters:
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div class="text-xs">
                  <span class="text-gray-600">Mark:</span>
                  <span class="ml-1">{{ row.mark || 'N/A' }}</span>
                </div>
                <div v-if="row.host" class="text-xs">
                  <span class="text-gray-600">Host:</span>
                  <span class="ml-1">{{ row.host }}</span>
                </div>
                <div v-if="row.name" class="text-xs">
                  <span class="text-gray-600">Name:</span>
                  <span class="ml-1">{{ row.name }}</span>
                </div>
              </div>
            </div>

            <!-- Active Parameters -->
            <div v-if="row.parameters" class="ml-4 mb-2">
              <div class="text-xs font-medium text-gray-500 mb-1">
                Active Parameters:
              </div>
              <div class="grid grid-cols-2 gap-2">
                <template v-for="col in visibleColumns" :key="col.field">
                  <div v-if="row.parameters[col.field]" class="text-xs">
                    <span class="text-gray-600">{{ col.header }}:</span>
                    <span class="ml-1">{{ row.parameters[col.field] }}</span>
                  </div>
                </template>
              </div>
            </div>

            <!-- Extracted Fields -->
            <div v-if="row.extractedFields" class="ml-4 mb-2">
              <div class="text-xs font-medium text-gray-500 mb-1">Parameters:</div>
              <div class="grid grid-cols-2 gap-2">
                <div
                  v-for="(value, key) in row.extractedFields"
                  :key="key"
                  class="text-xs"
                >
                  <span class="text-gray-600">{{ key }}:</span>
                  <span class="ml-1">{{ value || 'N/A' }}</span>
                </div>
              </div>
            </div>

            <!-- Raw Data Groups -->
            <div v-if="row._raw" class="ml-4">
              <div class="text-xs font-medium text-gray-500 mb-1">Groups:</div>
              <div class="space-y-2">
                <template
                  v-for="(group, groupName) in groupedRawData(row._raw)"
                  :key="groupName"
                >
                  <div v-if="Object.keys(group).length > 0">
                    <div class="text-xs font-medium text-blue-600 mb-1">
                      {{ groupName }}:
                    </div>
                    <div class="grid grid-cols-2 gap-2 ml-2">
                      <div v-for="(value, key) in group" :key="key" class="text-xs">
                        <span class="text-gray-600">{{ key }}:</span>
                        <span
                          class="ml-1"
                          :class="{
                            'text-blue-600':
                              groupName === 'Constraints' && key === 'Host' && value,
                            'text-red-600':
                              groupName === 'Constraints' && key === 'Host' && !value
                          }"
                        >
                          {{ value || 'N/A' }}
                        </span>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <!-- Details Count -->
            <div v-if="row.details?.length" class="ml-4 mt-2 text-xs text-gray-600">
              <span class="font-medium">Details:</span>
              <span class="ml-1">{{ row.details.length }} items</span>
            </div>
            <div>
              <div class="ml-4 text-xs text-gray-600">
                <span>Mark: {{ row.mark || 'N/A' }}</span>
                <span v-if="row.details?.length" class="ml-2">
                  Details: {{ row.details.length }}
                </span>
                <span v-if="row.host" class="ml-2">Host: {{ row.host }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-if="showRawData" class="space-y-4">
          <!-- Data Stats with Visual Indicators -->
          <div class="space-y-2">
            <h4 class="font-medium">Data Stats:</h4>
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-white p-3 rounded shadow-sm">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Schedule Data</span>
                  <span class="font-medium">{{ scheduleData.length }}</span>
                </div>
                <div class="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-blue-500 transition-all duration-500"
                    :style="{
                      width: `${scheduleDataProgress}%`
                    }"
                  ></div>
                </div>
              </div>
              <div class="bg-white p-3 rounded shadow-sm">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Evaluated Data</span>
                  <span class="font-medium">{{ evaluatedData.length }}</span>
                </div>
                <div class="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-green-500 transition-all duration-500"
                    :style="{
                      width: `${evaluatedDataProgress}%`
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Category Stats -->
          <div class="space-y-2">
            <h4 class="font-medium">Category Stats:</h4>
            <div class="bg-white p-3 rounded shadow-sm">
              <div class="space-y-2">
                <div>
                  <div class="text-sm font-medium mb-1">Parent Categories:</div>
                  <div class="text-xs text-gray-600">
                    {{ uniqueParentCategories.join(', ') || 'None' }}
                  </div>
                </div>
                <div>
                  <div class="text-sm font-medium mb-1">Child Categories:</div>
                  <div class="text-xs text-gray-600">
                    {{ uniqueChildCategories.join(', ') || 'None' }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Relationship Stats -->
          <div class="space-y-2">
            <h4 class="font-medium">Relationship Stats:</h4>
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-white p-3 rounded shadow-sm">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Parent Elements</span>
                  <span class="font-medium">{{ parentElements.length }}</span>
                </div>
                <div class="mt-2 text-xs text-gray-500">
                  With marks: {{ parentElementsWithMarks.length }}
                  <span
                    class="ml-1 text-xs"
                    :class="
                      parentElementsWithMarks.length === parentElements.length
                        ? 'text-green-600'
                        : 'text-red-600'
                    "
                  >
                    ({{
                      Math.round(
                        (parentElementsWithMarks.length / parentElements.length) * 100
                      ) || 0
                    }}%)
                  </span>
                </div>
              </div>
              <div class="bg-white p-3 rounded shadow-sm">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Child Elements</span>
                  <span class="font-medium">{{ childElements.length }}</span>
                </div>
                <div class="mt-2 text-xs text-gray-500">
                  With hosts: {{ childElementsWithHosts.length }}
                  <span
                    class="ml-1 text-xs"
                    :class="
                      childElementsWithHosts.length === childElements.length
                        ? 'text-green-600'
                        : 'text-red-600'
                    "
                  >
                    ({{
                      Math.round(
                        (childElementsWithHosts.length / childElements.length) * 100
                      ) || 0
                    }}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Parent-Child Relationships -->
          <div class="space-y-2">
            <h4 class="font-medium">Parent-Child Relationships:</h4>
            <div class="bg-white p-3 rounded shadow-sm">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-gray-600">Matched Relationships</span>
                <span class="font-medium">{{ matchedRelationships.length }}</span>
              </div>
              <div class="text-xs text-gray-500 space-y-1">
                <div class="flex justify-between">
                  <span>Orphaned children:</span>
                  <span
                    :class="
                      orphanedChildren.length === 0 ? 'text-green-600' : 'text-red-600'
                    "
                    class="font-medium"
                  >
                    {{ orphanedChildren.length }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span>Parents without children:</span>
                  <span
                    :class="
                      parentsWithoutChildren.length === 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    "
                    class="font-medium"
                  >
                    {{ parentsWithoutChildren.length }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Parent Elements List -->
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <h4 class="font-medium">Parent Elements:</h4>
              <div class="flex items-center gap-2">
                <div class="relative">
                  <label for="parentFilter" class="sr-only">Filter parents</label>
                  <input
                    id="parentFilter"
                    v-model="parentFilter"
                    type="text"
                    placeholder="Filter parents..."
                    class="px-2 py-1 text-xs border rounded"
                  />
                </div>
                <div class="relative">
                  <label for="parentSort" class="sr-only">Sort parents</label>
                  <select
                    id="parentSort"
                    v-model="parentSort"
                    class="text-xs border rounded px-1 py-1"
                  >
                    <option value="category">Sort by Category</option>
                    <option value="mark">Sort by Mark</option>
                    <option value="children">Sort by Children</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="bg-white p-3 rounded shadow-sm max-h-60 overflow-auto">
              <div
                v-for="parent in filteredSortedParents"
                :key="parent.id"
                class="mb-2"
              >
                <div class="flex items-center gap-2">
                  <span
                    class="w-2 h-2 rounded-full"
                    :class="parent.mark ? 'bg-green-500' : 'bg-red-500'"
                    :title="parent.mark ? 'Has mark' : 'Missing mark'"
                  ></span>
                  <span class="text-sm">{{ parent.type }} ({{ parent.category }})</span>
                </div>
                <div class="ml-4 text-xs text-gray-600">
                  Mark: {{ parent.mark || 'Missing' }}
                  <span v-if="getChildrenCount(parent)" class="ml-2">
                    Children: {{ getChildrenCount(parent) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Child Elements List -->
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <h4 class="font-medium">Child Elements:</h4>
              <div class="flex items-center gap-2">
                <div class="relative">
                  <label for="childFilter" class="sr-only">Filter children</label>
                  <input
                    id="childFilter"
                    v-model="childFilter"
                    type="text"
                    placeholder="Filter children..."
                    class="px-2 py-1 text-xs border rounded"
                  />
                </div>
                <div class="relative">
                  <label for="childSort" class="sr-only">Sort children</label>
                  <select
                    id="childSort"
                    v-model="childSort"
                    class="text-xs border rounded px-1 py-1"
                  >
                    <option value="category">Sort by Category</option>
                    <option value="host">Sort by Host</option>
                    <option value="status">Sort by Status</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="bg-white p-3 rounded shadow-sm max-h-60 overflow-auto">
              <div v-for="child in filteredSortedChildren" :key="child.id" class="mb-2">
                <div class="flex items-center gap-2">
                  <span
                    class="w-2 h-2 rounded-full"
                    :class="isChildMatched(child) ? 'bg-green-500' : 'bg-red-500'"
                    :title="
                      isChildMatched(child) ? 'Matched with parent' : 'No parent match'
                    "
                  ></span>
                  <span class="text-sm">{{ child.type }} ({{ child.category }})</span>
                </div>
                <div class="ml-4 text-xs text-gray-600">
                  Host: {{ child.host || 'Missing' }}
                  <span
                    v-if="child.host"
                    class="ml-2"
                    :class="isHostValid(child.host) ? 'text-green-600' : 'text-red-600'"
                  >
                    {{ isHostValid(child.host) ? '(Valid)' : '(Invalid)' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Raw Data with Search -->
          <div v-if="filteredData.length > 0" class="space-y-2">
            <h4 class="font-medium">Filtered Data:</h4>
            <pre
              class="text-xs bg-white p-2 rounded overflow-auto max-h-60 shadow-inner"
              >{{ JSON.stringify(filteredData, null, 2) }}</pre
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ElementData, TableRowData } from '../../types'
import { debug, DebugCategories } from '../../utils/debug'
import { isElementData } from '../../types'
import type { ColumnDef } from '../../../components/tables/DataTable/composables/columns/types'

interface Props {
  scheduleData: ElementData[]
  evaluatedData: ElementData[]
  tableData: TableRowData[]
  debugFilter: string
  selectedParentCategories: string[]
  selectedChildCategories: string[]
  parentElements: ElementData[]
  childElements: ElementData[]
  matchedElements: ElementData[]
  orphanedElements: ElementData[]
  mergedTableColumns: ColumnDef[] // Add this prop
  mergedDetailColumns: ColumnDef[] // Add this prop
}

const props = defineProps<Props>()
const emit = defineEmits<{
  toggle: []
}>()

const showRawData = ref(false)
const filterModel = computed({
  get: () => props.debugFilter,
  set: (value: string) => {
    debug.log(DebugCategories.DEBUG, 'Debug filter updated:', { value })
  }
})

// Filtering and sorting state
const parentFilter = ref('')
const childFilter = ref('')
const parentSort = ref('category')
const childSort = ref('category')

const maxItems = 1000 // For progress bars

const visibleColumns = computed(() => {
  return [...props.mergedTableColumns, ...props.mergedDetailColumns].filter(
    (col) => col.visible
  )
})

const scheduleDataProgress = computed(() =>
  Math.min((props.scheduleData.length / maxItems) * 100, 100)
)

const evaluatedDataProgress = computed(() =>
  Math.min((props.evaluatedData.length / maxItems) * 100, 100)
)

// Parent-child relationship computeds
const parentElements = computed(() => props.scheduleData.filter((el) => !el.isChild))

const childElements = computed(() => props.scheduleData.filter((el) => el.isChild))

const parentElementsWithMarks = computed(() =>
  parentElements.value.filter((el) => el.mark)
)

const childElementsWithHosts = computed(() =>
  childElements.value.filter((el) => el.host)
)

const uniqueParentCategories = computed(() =>
  [...new Set(parentElements.value.map((el) => el.category))].sort()
)

const uniqueChildCategories = computed(() =>
  [...new Set(childElements.value.map((el) => el.category))].sort()
)

const parentMarkMap = computed(() => {
  const map = new Map<string, ElementData>()
  parentElements.value.forEach((parent) => {
    if (parent.mark) {
      map.set(parent.mark, parent)
    }
  })
  return map
})

const matchedRelationships = computed(() =>
  childElements.value.filter(
    (child) => child.host && parentMarkMap.value.has(child.host)
  )
)

const orphanedChildren = computed(() =>
  childElements.value.filter(
    (child) => !child.host || !parentMarkMap.value.has(child.host)
  )
)

const parentsWithoutChildren = computed(() =>
  parentElements.value.filter(
    (parent) => !childElements.value.some((child) => child.host === parent.mark)
  )
)

// Filtered and sorted lists
const tableDataFilter = ref('')
const tableDataSort = ref('category')

// Helper function to group raw data by prefix
function groupedRawData(rawData: unknown): Record<string, Record<string, unknown>> {
  if (typeof rawData !== 'object' || !rawData) return {}

  const groups: Record<string, Record<string, unknown>> = {}

  for (const [key, value] of Object.entries(rawData as Record<string, unknown>)) {
    const [group, ...rest] = key.split('.')
    if (!group || !rest.length) continue

    if (!groups[group]) {
      groups[group] = {}
    }

    groups[group][rest.join('.')] = value
  }

  return groups
}

// Helper function to get only the parameters that correspond to visible columns
function getVisibleParameters(parameters: Record<string, unknown>) {
  const visibleColumns = [...props.mergedTableColumns, ...props.mergedDetailColumns]
    .filter((col) => col.visible)
    .map((col) => col.field)

  return Object.entries(parameters).reduce((acc, [key, value]) => {
    if (visibleColumns.includes(key)) {
      acc[key] = value
    }
    return acc
  }, {} as Record<string, unknown>)
}

// Add new computed property for filtered and sorted table data
const filteredSortedTableData = computed(() => {
  let filtered = props.tableData

  if (tableDataFilter.value) {
    const filter = tableDataFilter.value.toLowerCase()
    filtered = filtered.filter((row) => {
      const basicInfo = [row.category, row.type, row.mark, row.host]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const parameters = row.parameters
        ? Object.values(getVisibleParameters(row.parameters))
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
        : ''

      const extractedFields = row.extractedFields
        ? Object.values(row.extractedFields).filter(Boolean).join(' ').toLowerCase()
        : ''

      return (
        basicInfo.includes(filter) ||
        parameters.includes(filter) ||
        extractedFields.includes(filter)
      )
    })
  }

  return [...filtered].sort((a, b) => {
    switch (tableDataSort.value) {
      case 'category':
        return (a.category || '').localeCompare(b.category || '')
      case 'type':
        return (a.type || '').localeCompare(b.type || '')
      case 'details':
        return (b.details?.length || 0) - (a.details?.length || 0)
      default:
        return 0
    }
  })
})

const filteredSortedParents = computed(() => {
  let filtered = parentElements.value

  if (parentFilter.value) {
    const filter = parentFilter.value.toLowerCase()
    filtered = filtered.filter(
      (parent) =>
        parent.category.toLowerCase().includes(filter) ||
        parent.type?.toLowerCase().includes(filter) ||
        parent.mark?.toLowerCase().includes(filter)
    )
  }

  return [...filtered].sort((a, b) => {
    switch (parentSort.value) {
      case 'category':
        return a.category.localeCompare(b.category)
      case 'mark':
        return (a.mark || '').localeCompare(b.mark || '')
      case 'children':
        return getChildrenCount(b) - getChildrenCount(a)
      default:
        return 0
    }
  })
})

const filteredSortedChildren = computed(() => {
  let filtered = childElements.value

  if (childFilter.value) {
    const filter = childFilter.value.toLowerCase()
    filtered = filtered.filter(
      (child) =>
        child.category.toLowerCase().includes(filter) ||
        child.type?.toLowerCase().includes(filter) ||
        child.host?.toLowerCase().includes(filter)
    )
  }

  // Move variable declarations outside case blocks
  const compareByStatus = (a: ElementData, b: ElementData) => {
    const aMatched = isChildMatched(a)
    const bMatched = isChildMatched(b)
    return aMatched === bMatched ? 0 : aMatched ? -1 : 1
  }

  return [...filtered].sort((a, b) => {
    switch (childSort.value) {
      case 'category':
        return a.category.localeCompare(b.category)
      case 'host':
        return (a.host || '').localeCompare(b.host || '')
      case 'status':
        return compareByStatus(a, b)
      default:
        return 0
    }
  })
})

// Helper functions
function getChildrenCount(parent: ElementData): number {
  return childElements.value.filter((child) => child.host === parent.mark).length
}

function isChildMatched(child: ElementData): boolean {
  return child.host ? parentMarkMap.value.has(child.host) : false
}

function isHostValid(host: string): boolean {
  return parentMarkMap.value.has(host)
}

const filteredData = computed((): ElementData[] => {
  if (!props.debugFilter) return props.scheduleData
  const filter = props.debugFilter.toLowerCase()
  return props.scheduleData.filter((item) => {
    if (!isElementData(item)) return false
    return JSON.stringify(item).toLowerCase().includes(filter)
  })
})

const toggle = () => {
  showRawData.value = !showRawData.value
  emit('toggle')
}
</script>

<style scoped>
.debug-panel {
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
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
</style>
