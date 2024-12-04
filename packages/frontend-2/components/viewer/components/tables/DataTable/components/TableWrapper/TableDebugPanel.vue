<template>
  <div class="bg-gray-50 p-4 border-t">
    <div class="space-y-4">
      <!-- Relationship Stats -->
      <div>
        <h3 class="font-medium mb-2">Relationship Stats</h3>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-white p-3 rounded shadow-sm">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">Parent Elements</span>
              <span class="font-medium">{{ parentCount }}</span>
            </div>
            <div class="mt-2 text-xs text-gray-500">
              With marks: {{ parentsWithMarks }}
              <span
                class="ml-1"
                :class="
                  parentsWithMarks === parentCount ? 'text-green-600' : 'text-red-600'
                "
              >
                ({{ parentMarkPercentage }}%)
              </span>
            </div>
          </div>
          <div class="bg-white p-3 rounded shadow-sm">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">Child Elements</span>
              <span class="font-medium">{{ childCount }}</span>
            </div>
            <div class="mt-2 text-xs text-gray-500">
              With hosts: {{ childrenWithHosts }}
              <span
                class="ml-1"
                :class="
                  childrenWithHosts === childCount ? 'text-green-600' : 'text-red-600'
                "
              >
                ({{ childHostPercentage }}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Relationship Details -->
      <div>
        <h3 class="font-medium mb-2">Relationship Details</h3>
        <div class="bg-white p-3 rounded shadow-sm">
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Matched Relationships</span>
              <span class="font-medium">{{ matchedCount }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Orphaned Children</span>
              <span
                class="font-medium"
                :class="orphanedCount === 0 ? 'text-green-600' : 'text-red-600'"
              >
                {{ orphanedCount }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Parents without Children</span>
              <span
                class="font-medium"
                :class="
                  parentsWithoutChildren === 0 ? 'text-green-600' : 'text-red-600'
                "
              >
                {{ parentsWithoutChildren }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Column Information -->
      <div>
        <h3 class="font-medium mb-2">Column Information</h3>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-white p-3 rounded shadow-sm">
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm text-gray-600">Parent Columns</span>
              <span class="font-medium">{{ parentColumns.length }}</span>
            </div>
            <div class="text-xs text-gray-500">
              <div>Visible: {{ visibleParentColumns.length }}</div>
              <div>
                Relationship Fields: {{ parentRelationshipFields.join(', ') || 'None' }}
              </div>
            </div>
          </div>
          <div class="bg-white p-3 rounded shadow-sm">
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm text-gray-600">Child Columns</span>
              <span class="font-medium">{{ childColumns.length }}</span>
            </div>
            <div class="text-xs text-gray-500">
              <div>Visible: {{ visibleChildColumns.length }}</div>
              <div>
                Relationship Fields: {{ childRelationshipFields.join(', ') || 'None' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Transformation -->
      <div>
        <h3 class="font-medium mb-2">Data Transformation</h3>
        <div class="bg-white p-3 rounded shadow-sm">
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Total Rows</span>
              <span class="font-medium">{{ scheduleData.length }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">With Details</span>
              <span class="font-medium">{{ rowsWithDetails }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Expanded Rows</span>
              <span class="font-medium">{{ expandedRows.length }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ColumnDef, TableRow } from '~/composables/core/types'

interface Props {
  data: TableRow[]
  scheduleData: TableRow[]
  expandedRows: TableRow[]
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
}

const props = defineProps<Props>()

// Type guard for ColumnDef
function isColumnDef(col: unknown): col is ColumnDef {
  return (
    typeof col === 'object' &&
    col !== null &&
    'field' in col &&
    typeof (col as ColumnDef).field === 'string' &&
    'visible' in col &&
    typeof (col as ColumnDef).visible === 'boolean'
  )
}

// Parent stats - using scheduleData
const parentCount = computed(
  () => props.scheduleData.filter((row) => !row.isChild).length
)
const parentsWithMarks = computed(
  () => props.scheduleData.filter((row) => !row.isChild && row.mark).length
)
const parentMarkPercentage = computed(() =>
  Math.round((parentsWithMarks.value / (parentCount.value || 1)) * 100)
)

// Child stats - using scheduleData
const childCount = computed(
  () => props.scheduleData.filter((row) => row.isChild).length
)
const childrenWithHosts = computed(
  () => props.scheduleData.filter((row) => row.isChild && row.host).length
)
const childHostPercentage = computed(() =>
  Math.round((childrenWithHosts.value / (childCount.value || 1)) * 100)
)

// Relationship stats - using scheduleData
const matchedCount = computed(() => {
  const parentMarks = new Set(
    props.scheduleData.filter((row) => !row.isChild && row.mark).map((row) => row.mark)
  )
  return props.scheduleData.filter(
    (row) => row.isChild && row.host && parentMarks.has(row.host)
  ).length
})

const orphanedCount = computed(() => {
  const parentMarks = new Set(
    props.scheduleData.filter((row) => !row.isChild && row.mark).map((row) => row.mark)
  )
  return props.scheduleData.filter(
    (row) => row.isChild && (!row.host || !parentMarks.has(row.host))
  ).length
})

const parentsWithoutChildren = computed(() => {
  const childHosts = new Set(
    props.scheduleData.filter((row) => row.isChild && row.host).map((row) => row.host)
  )
  return props.scheduleData.filter(
    (row) => !row.isChild && row.mark && !childHosts.has(row.mark)
  ).length
})

// Column stats with type safety
const visibleParentColumns = computed(() =>
  props.parentColumns.filter((col) => isColumnDef(col) && col.visible)
)

const visibleChildColumns = computed(() =>
  props.childColumns.filter((col) => isColumnDef(col) && col.visible)
)

const relationshipFields = ['mark', 'host', 'category'] as const
type RelationshipField = (typeof relationshipFields)[number]

function isRelationshipField(field: string): field is RelationshipField {
  return relationshipFields.includes(field as RelationshipField)
}

const parentRelationshipFields = computed(() =>
  props.parentColumns
    .filter(
      (col): col is ColumnDef => isColumnDef(col) && isRelationshipField(col.field)
    )
    .map((col) => col.field)
)

const childRelationshipFields = computed(() =>
  props.childColumns
    .filter(
      (col): col is ColumnDef => isColumnDef(col) && isRelationshipField(col.field)
    )
    .map((col) => col.field)
)

// Data transformation stats - using scheduleData for total count
const rowsWithDetails = computed(
  () =>
    props.scheduleData.filter(
      (row) => Array.isArray(row.details) && row.details.length > 0
    ).length
)
</script>

<style scoped>
.grid {
  display: grid;
}

.grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.gap-4 {
  gap: 1rem;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

.space-y-2 > * + * {
  margin-top: 0.5rem;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.justify-between {
  justify-content: space-between;
}

.bg-white {
  background-color: rgb(255 255 255);
}

.bg-gray-50 {
  background-color: rgb(249 250 251);
}

.rounded {
  border-radius: 0.25rem;
}

.shadow-sm {
  box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
}

.text-green-600 {
  color: rgb(22 163 74);
}

.text-red-600 {
  color: rgb(220 38 38);
}

.text-gray-500 {
  color: rgb(107 114 128);
}

.text-gray-600 {
  color: rgb(75 85 99);
}

.font-medium {
  font-weight: 500;
}

.text-sm {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.text-xs {
  font-size: 0.75rem;
  line-height: 1rem;
}

.p-3 {
  padding: 0.75rem;
}

.p-4 {
  padding: 1rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mt-2 {
  margin-top: 0.5rem;
}

.ml-1 {
  margin-left: 0.25rem;
}

.border-t {
  border-top: 1px solid rgb(229 231 235);
}
</style>
