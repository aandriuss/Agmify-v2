<template>
  <div class="parameter-list">
    <div
      v-for="parameter in parameters"
      :key="parameter.id"
      class="parameter-item"
      :class="{
        'is-selected': isSelected(parameter),
        'is-visible': isVisible(parameter),
        'has-nested': parameter.metadata?.isNested
      }"
    >
      <!-- Main Parameter -->
      <div class="parameter-row">
        <FormButton
          text
          size="sm"
          :icon-left="isVisible(parameter) ? CheckCircleIcon : CheckCircleIconOutlined"
          @click="$emit('visibility-change', parameter)"
        >
          {{ parameter.name }}
        </FormButton>

        <div class="parameter-info">
          <!-- Parameter Type Badge -->
          <span class="parameter-type" :class="parameter.type">
            {{ parameter.type }}
          </span>

          <!-- Parameter Value -->
          <span class="parameter-value" :title="String(parameter.value)">
            {{ formatValue(parameter.value) }}
          </span>
        </div>

        <!-- Nested Parameters Indicator -->
        <FormButton
          v-if="parameter.metadata?.isNested"
          text
          size="sm"
          :icon-left="parameter.showNested ? ChevronUpIcon : ChevronDownIcon"
          @click="$emit('toggle-nested', parameter)"
        />
      </div>

      <!-- Nested Parameters -->
      <div
        v-if="
          parameter.metadata?.isNested &&
          parameter.showNested &&
          nestedParameters[parameter.id]
        "
        class="nested-parameters"
      >
        <ParameterList
          :parameters="nestedParameters[parameter.id]"
          :is-selected="isSelected"
          :is-visible="isVisible"
          :nested-parameters="nestedParameters"
          @visibility-change="$emit('visibility-change', $event)"
          @toggle-nested="$emit('toggle-nested', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CheckCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/vue/24/solid'
import { CheckCircleIcon as CheckCircleIconOutlined } from '@heroicons/vue/24/outline'
import type { AvailableBimParameter } from '~/composables/core/types/parameters/parameter-states'
import type { ParameterValue } from '~/composables/core/types'

interface ExtendedBimParameter extends AvailableBimParameter {
  showNested?: boolean
}

defineProps<{
  parameters: ExtendedBimParameter[]
  isSelected: (param: AvailableBimParameter) => boolean
  isVisible: (param: AvailableBimParameter) => boolean
  nestedParameters: Record<string, ExtendedBimParameter[]>
}>()

// Format parameter value for display
function formatValue(value: ParameterValue): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string')
    return value.length > 20 ? value.slice(0, 20) + '...' : value
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'object') return '{...}'
  return String(value)
}

defineEmits<{
  (e: 'visibility-change', parameter: AvailableBimParameter): void
  (e: 'toggle-nested', parameter: ExtendedBimParameter): void
}>()
</script>

<style scoped>
.parameter-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.parameter-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: 0.25rem;
}

.parameter-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.parameter-item:hover {
  background: var(--color-background-hover);
}

.parameter-item.is-selected {
  background: var(--color-background-selected);
}

.nested-parameters {
  margin-left: 1.5rem;
  padding-left: 0.5rem;
  border-left: 1px solid var(--color-border);
}

.parameter-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.parameter-type {
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  background: var(--color-background-muted);
  color: var(--color-foreground-muted);
}

.parameter-type.number {
  background: var(--color-primary-muted);
  color: var(--color-primary);
}

.parameter-type.string {
  background: var(--color-success-muted);
  color: var(--color-success);
}

.parameter-type.boolean {
  background: var(--color-warning-muted);
  color: var(--color-warning);
}

.parameter-type.equation {
  background: var(--color-info-muted);
  color: var(--color-info);
}

.parameter-value {
  font-size: 0.75rem;
  color: var(--color-foreground-muted);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
