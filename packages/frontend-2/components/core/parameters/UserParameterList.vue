<template>
  <div class="parameter-list">
    <!-- Grouped Parameters -->
    <div class="parameter-group">
      <button
        type="button"
        class="group-header"
        :class="{ collapsed: isCollapsed }"
        :aria-expanded="!isCollapsed"
        @click="toggleCollapse"
        @keydown.enter="toggleCollapse"
        @keydown.space.prevent="toggleCollapse"
      >
        <ChevronRightIcon class="chevron-icon" :class="{ 'rotate-90': !isCollapsed }" />
        <span>{{ props.group || 'All' }}</span>
        <span class="parameter-count">({{ props.parameters.length }})</span>
      </button>

      <div v-show="!isCollapsed" class="group-content">
        <div
          v-for="parameter in props.parameters"
          :key="parameter.id"
          class="parameter-item"
        >
          <div class="parameter-row">
            <div class="parameter-info">
              <span class="parameter-name">{{ parameter.name }}</span>
              <span
                class="parameter-value"
                :title="
                  parameter.type === 'equation'
                    ? parameter.equation
                    : String(props.getCurrentValue(parameter))
                "
                :data-parameter-id="parameter.id"
              >
                {{ formatValue(props.getCurrentValue(parameter), parameter) }}
              </span>
              <span class="parameter-type" :class="parameter.type">
                {{ parameter.type }}
              </span>
            </div>
            <div class="parameter-actions">
              <FormButton text size="sm" @click="emit('update', parameter)">
                <PencilIcon class="size-4" />
              </FormButton>
              <FormButton text size="sm" @click="emit('delete', parameter)">
                <TrashIcon class="size-4" />
              </FormButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FormButton } from '@speckle/ui-components'
import { PencilIcon, TrashIcon, ChevronRightIcon } from '@heroicons/vue/24/solid'
import type { AvailableUserParameter, ParameterValue } from '~/composables/core/types'

const props = defineProps<{
  parameters: AvailableUserParameter[]
  group?: string
  getCurrentValue: (param: AvailableUserParameter) => ParameterValue
}>()

const emit = defineEmits<{
  (e: 'update', parameter: AvailableUserParameter): void
  (e: 'delete', parameter: AvailableUserParameter): void
}>()

// Group collapse state
const isCollapsed = ref(false)

// Toggle group collapse state
function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

// Format parameter value for display
function formatValue(
  value: ParameterValue,
  parameter?: AvailableUserParameter
): string {
  if (parameter?.type === 'equation' && parameter.equation) {
    return parameter.equation
  }

  if (value === null || value === undefined) return '-'
  if (typeof value === 'string')
    return value.length > 20 ? value.slice(0, 20) + '...' : value
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'object') return '{...}'
  return String(value)
}
</script>

<style scoped>
.parameter-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: var(--color-background);
}

.parameter-group {
  display: flex;
  flex-direction: column;
  font-size: small;
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  overflow: hidden;
}

.group-header {
  display: flex;
  align-items: center;
  border: transparent;
  gap: 0.5rem;
  font-size: small;
  font-weight: bold !important; /* TODO Fix bold */
  color: var(--color-foreground);
  background: var(--color-background-muted);
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
  width: 100%;
  text-align: left;
}

.group-header:hover {
  background: var(--color-background);
}

.group-header .parameter-count {
  color: var(--color-foreground-muted);
  font-weight: normal;
  font-size: 0.875rem;
}

.chevron-icon {
  width: 1rem;
  height: 1rem;
  transition: transform 0.2s ease;
}

.group-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.parameter-item {
  background: var(--surface-card);
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  transition: all 0.2s ease;
}

.parameter-item:hover {
  border-color: var(--color-primary-muted);
  box-shadow: 0 2px 4px rgb(0 0 0 / 5%);
}

.parameter-row {
  display: flex;
  align-items: center;
  padding-left: 1.6rem;
  justify-content: space-between;
  min-width: 0;
  width: 100%;
}

.parameter-info {
  display: grid;
  grid-template-columns: minmax(140px, 1.4fr) minmax(150px, 2fr) minmax(120px, 1fr);
  gap: 1rem;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.parameter-name {
  padding-left: 0.5rem;
  color: var(--color-foreground);
  white-space: nowrap;
}

.parameter-value {
  color: var(--color-foreground-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  justify-self: start;
  width: 100%;
  margin-right: 80px;
}

.parameter-type {
  font-size: 0.875rem;
  border-radius: 0.25rem;
  padding: 0.125rem 0.5rem;
  background: var(--color-background-muted);
  color: var(--color-foreground-muted);
  white-space: nowrap;
  flex-shrink: 0;
  position: relative;
  right: 0;
  justify-self: end;
}

.parameter-type.fixed {
  background: var(--color-success-muted);
  color: var(--color-success);
}

.parameter-type.equation {
  background: var(--color-info-muted);
  color: var(--color-info);
}

.parameter-actions {
  display: flex;
  gap: 0.5rem;
  margin-left: 1rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.parameter-item:hover .parameter-actions {
  opacity: 1;
}

/* Animation classes */
.rotate-90 {
  transform: rotate(90deg);
}
</style>
