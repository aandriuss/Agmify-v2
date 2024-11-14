<template>
  <div class="bim-debug-view">
    <!-- Raw Data Section -->
    <div class="debug-section">
      <h3>1. Raw BIM Data</h3>
      <div v-if="rawElementsValue.length" class="data-list">
        <div v-for="element in rawElementsValue" :key="element.id" class="data-item">
          <div class="item-header">
            <span class="type">{{ element.type }}</span>
            <span class="id">{{ element.id }}</span>
          </div>
          <div class="item-details">
            <div>Mark: {{ element.mark }}</div>
            <div>Category: {{ element.category }}</div>
            <div v-if="element.host">Host: {{ element.host }}</div>
          </div>
          <pre class="raw-data">{{ JSON.stringify(element._raw, null, 2) }}</pre>
        </div>
      </div>
      <div v-else class="no-data">No raw elements available</div>
    </div>

    <!-- Filtered Data Section -->
    <div class="debug-section">
      <h3>2. Filtered by Categories</h3>
      <div class="filters-info">
        <div>Parent Categories: {{ parentCategories.join(', ') || 'All' }}</div>
        <div>Child Categories: {{ childCategories.join(', ') || 'All' }}</div>
      </div>
      <div v-if="rawElementsValue.length" class="data-list">
        <div v-for="element in rawElementsValue" :key="element.id" class="data-item">
          <div class="item-header">
            <span class="type">{{ element.type }}</span>
            <span class="mark">{{ element.mark }}</span>
          </div>
          <div class="item-details">
            <div>Category: {{ element.category }}</div>
            <div v-if="element.host">Host: {{ element.host }}</div>
          </div>
        </div>
      </div>
      <div v-else class="no-data">No filtered elements</div>
    </div>

    <!-- Parents and Children Section -->
    <div class="debug-section">
      <h3>3. Parents and Children</h3>
      <div class="split-view">
        <div class="split-section">
          <h4>Parents ({{ parentElementsValue.length }})</h4>
          <div v-if="parentElementsValue.length" class="data-list">
            <div
              v-for="element in parentElementsValue"
              :key="element.id"
              class="data-item"
            >
              <div class="item-header">
                <span class="type">{{ element.type }}</span>
                <span class="mark">{{ element.mark }}</span>
              </div>
              <div class="item-details">
                <div>Category: {{ element.category }}</div>
              </div>
            </div>
          </div>
          <div v-else class="no-data">No parent elements</div>
        </div>
        <div class="split-section">
          <h4>Children ({{ childElementsValue.length }})</h4>
          <div v-if="childElementsValue.length" class="data-list">
            <div
              v-for="element in childElementsValue"
              :key="element.id"
              class="data-item"
            >
              <div class="item-header">
                <span class="type">{{ element.type }}</span>
                <span class="mark">{{ element.mark }}</span>
              </div>
              <div class="item-details">
                <div>Category: {{ element.category }}</div>
                <div>Host: {{ element.host || 'None' }}</div>
              </div>
            </div>
          </div>
          <div v-else class="no-data">No child elements</div>
        </div>
      </div>
    </div>

    <!-- Matched Data Section -->
    <div class="debug-section">
      <h3>4. Matched Parents and Children</h3>
      <div v-if="matchedElementsValue.length" class="data-list">
        <div
          v-for="element in matchedElementsValue"
          :key="element.id"
          class="data-item"
        >
          <div class="item-header">
            <span class="type">{{ element.type }}</span>
            <span class="mark">{{ element.mark }}</span>
          </div>
          <div class="item-details">
            <div>Category: {{ element.category }}</div>
            <div v-if="element.details?.length">
              Children ({{ element.details.length }}):
              <ul>
                <li v-for="child in element.details" :key="child.id">
                  {{ child.type }} - {{ child.mark }}
                  <div class="child-details">
                    Category: {{ child.category }}
                    <div v-if="child.host">Host: {{ child.host }}</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="no-data">No matched elements</div>
    </div>

    <!-- Stats Section -->
    <div class="debug-section">
      <h3>Data Stats</h3>
      <div class="stats">
        <div>Raw Elements: {{ rawElementsValue.length }}</div>
        <div>Parent Elements: {{ parentElementsValue.length }}</div>
        <div>Child Elements: {{ childElementsValue.length }}</div>
        <div>Matched Elements: {{ matchedElementsValue.length }}</div>
        <div>Orphaned Elements: {{ orphanedElementsValue.length }}</div>
        <div>Elements with Parameters: {{ elementsWithParameters }}</div>
        <div>Elements with Details: {{ elementsWithDetails }}</div>
        <div>Parent Categories: {{ uniqueParentCategories.join(', ') }}</div>
        <div>Child Categories: {{ uniqueChildCategories.join(', ') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Ref } from 'vue'
import type { ElementData } from '../types'

type MaybeRef<T> = T | Ref<T>

interface Props {
  selectedParentCategories: string[] | Ref<string[]>
  selectedChildCategories: string[] | Ref<string[]>
  rawElements: MaybeRef<ElementData[] | null>
  parentElements: MaybeRef<ElementData[]>
  childElements: MaybeRef<ElementData[]>
  matchedElements: MaybeRef<ElementData[]>
  orphanedElements: MaybeRef<ElementData[]>
}

const props = defineProps<Props>()

// Normalize category arrays to handle both ref and non-ref values
const parentCategories = computed(() => {
  return 'value' in props.selectedParentCategories
    ? props.selectedParentCategories.value
    : props.selectedParentCategories
})

const childCategories = computed(() => {
  return 'value' in props.selectedChildCategories
    ? props.selectedChildCategories.value
    : props.selectedChildCategories
})

// Normalize element arrays to handle both ref and non-ref values
const rawElementsValue = computed(() => {
  if (!props.rawElements) return []
  return 'value' in props.rawElements
    ? props.rawElements.value || []
    : props.rawElements
})

const parentElementsValue = computed(() => {
  return 'value' in props.parentElements
    ? props.parentElements.value
    : props.parentElements
})

const childElementsValue = computed(() => {
  return 'value' in props.childElements
    ? props.childElements.value
    : props.childElements
})

const matchedElementsValue = computed(() => {
  return 'value' in props.matchedElements
    ? props.matchedElements.value
    : props.matchedElements
})

const orphanedElementsValue = computed(() => {
  return 'value' in props.orphanedElements
    ? props.orphanedElements.value
    : props.orphanedElements
})

// Stats
const elementsWithParameters = computed(
  () =>
    rawElementsValue.value.filter(
      (el: ElementData) => Object.keys(el.parameters || {}).length > 0
    ).length
)

const elementsWithDetails = computed(
  () =>
    rawElementsValue.value.filter((el: ElementData) => (el.details?.length ?? 0) > 0)
      .length
)

const uniqueParentCategories = computed(() => [
  ...new Set(parentElementsValue.value.map((el: ElementData) => el.category))
])

const uniqueChildCategories = computed(() => [
  ...new Set(childElementsValue.value.map((el: ElementData) => el.category))
])
</script>

<style scoped>
.bim-debug-view {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1rem;
  padding: 1rem;
}

.debug-section {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1rem;
  background: #fff;
}

h3 {
  margin-top: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
  color: #333;
}

h4 {
  margin: 0.5rem 0;
  color: #666;
}

.filters-info {
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: #f5f5f5;
  border-radius: 4px;
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
  background: #fafafa;
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

.item-details {
  font-size: 0.9em;
  margin-bottom: 0.5rem;
}

.item-details ul {
  margin: 0.25rem 0;
  padding-left: 1.5rem;
}

.child-details {
  margin-left: 1rem;
  font-size: 0.9em;
  color: #666;
}

.raw-data {
  font-size: 0.8em;
  background: #f5f5f5;
  padding: 0.5rem;
  border-radius: 4px;
  overflow-x: auto;
  margin: 0;
}

.no-data {
  color: #666;
  font-style: italic;
  padding: 1rem;
  text-align: center;
}

.split-view {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.split-section {
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 0.5rem;
}

.stats {
  display: grid;
  gap: 0.5rem;
}

.stats > div {
  padding: 0.5rem;
  background: #f5f5f5;
  border-radius: 4px;
}
</style>
