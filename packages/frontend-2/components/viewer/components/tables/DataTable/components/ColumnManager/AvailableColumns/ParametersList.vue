<template>
  <div class="flex-1 overflow-y-auto p-1 space-y-1">
    <!-- When Grouped -->
    <template v-if="isGrouped">
      <div v-for="group in parameters" :key="group.category" class="space-y-1">
        <div class="px-2 py-1 bg-gray-50 text-sm font-medium rounded">
          {{ group.category }}
        </div>
        <div class="space-y-1 pl-2">
          <template v-for="param in group.parameters" :key="param.field">
            <ParameterItem
              :parameter="param"
              :is-active="isParameterActive(param)"
              draggable="true"
              @add="$emit('add', param)"
              @dragstart="$emit('drag-start', $event, param)"
            />
          </template>
        </div>
      </div>
    </template>

    <!-- When Not Grouped -->
    <template v-else>
      <ParameterItem
        v-for="param in parameters"
        :key="param.field"
        :parameter="param"
        :is-active="isParameterActive(param)"
        draggable="true"
        @add="$emit('add', param)"
        @dragstart="$emit('drag-start', $event, param)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import ParameterItem from '../../../../../../components/parameters/ParameterItem.vue'
import type { ParameterDefinition, ParameterGroup } from '../../../composables/types'

const props = defineProps<{
  parameters: ParameterGroup[] | ParameterDefinition[]
  isGrouped: boolean
  activeColumns: { field: string }[]
}>()

const emit = defineEmits<{
  add: [param: ParameterDefinition]
  'drag-start': [event: DragEvent, param: ParameterDefinition]
}>()

const isParameterActive = (param: ParameterDefinition) => {
  return props.activeColumns.some((col) => col.field === param.field)
}
</script>
