<template>
  <Column
    :field="field"
    :header="header"
    :data-field="field"
    :style="columnStyle"
    :sortable="sortable"
    :header-component="headerComponent"
    :expander="expander"
    :class="columnClass"
  >
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>

    <template v-if="$slots.body" #body>
      <slot name="body" />
    </template>
  </Column>
</template>

<script setup lang="ts">
import Column from 'primevue/column'
import { computed } from 'vue'

interface Props {
  field?: string
  header?: string
  width?: number | string
  sortable?: boolean
  headerComponent?: any
  expander?: boolean
  columnClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  sortable: false,
  expander: false
})

const columnStyle = computed(() => {
  if (props.expander) {
    return { width: '3rem' }
  }
  if (props.width) {
    return { width: typeof props.width === 'number' ? `${props.width}px` : props.width }
  }
  return { width: 'auto' }
})
</script>
