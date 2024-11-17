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
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ElementData } from '../../types'
import { debug, DebugCategories } from '../../utils/debug'
import { isElementData } from '../../types'

interface Props {
  scheduleData: ElementData[]
  evaluatedData: ElementData[]
  debugFilter: string
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

const maxItems = 1000 // For progress bars

const scheduleDataProgress = computed(() =>
  Math.min((props.scheduleData.length / maxItems) * 100, 100)
)

const evaluatedDataProgress = computed(() =>
  Math.min((props.evaluatedData.length / maxItems) * 100, 100)
)

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
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
}

.i-mdi-chevron-down,
.i-mdi-chevron-up {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  background-color: currentColor;
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: contain;
}

.i-mdi-chevron-down {
  mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6-6-6 1.41-1.42z"/></svg>');
}

.i-mdi-chevron-up {
  mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/></svg>');
}
</style>
