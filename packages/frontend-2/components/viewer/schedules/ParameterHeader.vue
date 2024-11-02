<template>
  <div class="flex items-center gap-2">
    <span>{{ parameter.header }}</span>
    <CommonBadge
      :color="parameter.isFixed ? 'blue' : 'green'"
      :text="parameter.isFixed ? 'Fixed' : 'New'"
    />
  </div>
</template>

<script setup lang="ts">
import { CommonBadge } from '@speckle/ui-components'
import type { ParameterDefinition } from './parameterManagement'

defineProps<{
  parameter: ParameterDefinition
}>()
</script>

<style scoped>
span {
  font-weight: 500;
}
</style>
