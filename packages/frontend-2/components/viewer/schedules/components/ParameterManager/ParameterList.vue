<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-2">
        <h3 class="text-lg font-medium">{{ groupName }}</h3>
        <span class="text-sm text-gray-500">({{ parameters.length }})</span>
      </div>
      <FormButton
        v-if="showAddButton"
        text
        size="sm"
        color="primary"
        @click="$emit('add')"
      >
        Add Parameter
      </FormButton>
    </div>

    <div v-if="parameters.length === 0" class="text-center text-gray-500 py-4">
      No parameters in this group
    </div>

    <div v-else class="space-y-4">
      <template v-for="parameter in sortedParameters" :key="parameter.id">
        <slot name="parameter" :parameter="parameter" v-bind="$attrs">
          <!-- Default parameter display if no slot is provided -->
          <div class="text-sm">{{ parameter.name }}</div>
        </slot>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CustomParameter } from '../../types'

const props = defineProps<{
  groupName: string
  parameters: CustomParameter[]
  showAddButton?: boolean
}>()

defineEmits<{
  (e: 'add'): void
}>()

const sortedParameters = computed(() => {
  return [...props.parameters].sort((a, b) => {
    // Sort by name
    return a.name.localeCompare(b.name)
  })
})
</script>
