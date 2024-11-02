<template>
  <div>
    <ViewerLayoutPanel @close="$emit('close')">
      <template #title>Data Processing</template>

      <div class="flex flex-col gap-4 p-4">
        <div class="flex items-center">
          <span>Processing</span>
          <CommonBadge class="ml-2" value="Active" severity="success" />
        </div>

        <div class="flex items-center">
          <span>Validation</span>
          <CommonBadge class="ml-2" value="Fixed" severity="info" />
        </div>

        <div class="flex items-center">
          <span>Analysis</span>
          <CommonBadge class="ml-2" value="New" severity="warning" />
        </div>
      </div>
    </ViewerLayoutPanel>
  </div>
</template>

<script setup lang="ts">
import { CommonBadge } from '@speckle/ui-components'

defineEmits(['close'])
</script>

<style scoped>
.p-badge {
  margin-left: 0.5rem;
}
</style>
