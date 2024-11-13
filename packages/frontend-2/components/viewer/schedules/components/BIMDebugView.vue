<!-- 
  BIMDebugView Component
  Shows raw BIM data alongside processed elements for debugging
-->
<template>
  <div class="bim-debug-view">
    <!-- Raw Data Section -->
    <div class="debug-section">
      <h3>Raw BIM Data</h3>
      <div v-if="rawElements.length" class="data-list">
        <div v-for="element in rawElements" :key="element.id" class="data-item">
          <div class="item-header">
            <span class="type">{{ element.type }}</span>
            <span class="id">{{ element.id }}</span>
          </div>
          <pre class="raw-data">{{ JSON.stringify(element.raw, null, 2) }}</pre>
        </div>
      </div>
      <div v-else class="no-data">No raw elements available</div>
    </div>

    <!-- Processed Data Section -->
    <div class="debug-section">
      <h3>Processed Elements</h3>
      <div v-if="processedElements.length" class="data-list">
        <div v-for="element in processedElements" :key="element.id" class="data-item">
          <div class="item-header">
            <span class="type">{{ element.type }}</span>
            <span class="mark">{{ element.mark }}</span>
          </div>
          <div class="item-details">
            <div>Category: {{ element.category }}</div>
            <div v-if="element.host">Host: {{ element.host }}</div>
            <div v-if="element.details?.length">
              Details:
              <ul>
                <li v-for="detail in element.details" :key="detail.name">
                  {{ detail.name }}: {{ detail.value }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="no-data">No processed elements available</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useElementsData } from '../composables/useElementsData'
import type { ElementData } from '../types'

interface RawBIMData {
  id: string
  type: string
  raw: Record<string, unknown>
}

interface RawNode {
  id?: string
  speckle_type?: string
  [key: string]: unknown
}

const { scheduleData } = useElementsData({
  _currentTableColumns: ref([]),
  _currentDetailColumns: ref([])
})

// Raw elements from scheduleData
const rawElements = computed<RawBIMData[]>(() => {
  return scheduleData.value.map((element) => {
    const raw = (element as unknown as { _raw?: RawNode })?._raw || {}
    return {
      id: raw.id?.toString() || 'unknown',
      type: raw.speckle_type?.toString() || 'unknown',
      raw: raw as Record<string, unknown>
    }
  })
})

// Processed elements
const processedElements = computed<ElementData[]>(() => scheduleData.value)
</script>

<style scoped>
.bim-debug-view {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
}

.debug-section {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1rem;
}

h3 {
  margin-top: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

.data-list {
  max-height: 600px;
  overflow-y: auto;
}

.data-item {
  margin-bottom: 1rem;
  padding: 0.5rem;
  border: 1px solid #eee;
  border-radius: 4px;
}

.item-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.type {
  color: #06c;
}

.id,
.mark {
  color: #666;
  font-size: 0.9em;
}

.raw-data {
  font-size: 0.8em;
  background: #f5f5f5;
  padding: 0.5rem;
  border-radius: 4px;
  overflow-x: auto;
}

.item-details {
  font-size: 0.9em;
}

.no-data {
  color: #666;
  font-style: italic;
  padding: 1rem;
  text-align: center;
}
</style>
