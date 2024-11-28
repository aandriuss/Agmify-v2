<template>
  <div>
    <ParameterManager
      v-if="show"
      :table-id="tableId"
      @close="$emit('update:show', false)"
      @update="$emit('update')"
    />
    <div v-else class="hidden"></div>
  </div>
</template>

<script setup lang="ts">
import { ParameterManager } from './ParameterManager/'

interface Props {
  show: boolean
  tableId: string
}

defineProps<Props>()

defineEmits<{
  'update:show': [value: boolean]
  update: []
}>()
</script>
