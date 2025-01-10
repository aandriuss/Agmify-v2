<template>
  <div class="parameter-list">
    <div class="group-header">{{ groupName }}</div>
    <div v-for="parameter in parameters" :key="parameter.id" class="parameter-item">
      <!-- Parameter Row -->
      <div class="parameter-row">
        <div class="parameter-info">
          <span class="parameter-name">{{ parameter.name }}</span>
          <span class="parameter-type" :class="parameter.type">
            {{ parameter.type }}
          </span>
          <span class="parameter-value" :title="String(getCurrentValue(parameter))">
            {{ formatValue(getCurrentValue(parameter)) }}
          </span>
        </div>

        <!-- Actions -->
        <div class="parameter-actions">
          <FormButton
            text
            size="sm"
            icon="pi pi-pencil"
            @click="$emit('update', parameter)"
          />
          <FormButton
            text
            size="sm"
            icon="pi pi-trash"
            @click="$emit('delete', parameter)"
          />
        </div>
      </div>
    </div>

    <!-- Add Parameter Button -->
    <div v-if="showAddButton && !isAddingNew" class="add-parameter">
      <FormButton text size="sm" icon="pi pi-plus" @click="$emit('add')">
        Add Parameter
      </FormButton>
    </div>

    <!-- Add Parameter Form -->
    <div v-if="isAddingNew" class="add-parameter-form">
      <div class="form-grid">
        <div class="form-field">
          <label for="param-name">Name</label>
          <input
            id="param-name"
            v-model="newParameter.name"
            type="text"
            class="form-input"
          />
        </div>
        <div class="form-field">
          <label for="param-type">Type</label>
          <select id="param-type" v-model="newParameter.type" class="form-input">
            <option value="fixed">Fixed Value</option>
            <option value="equation">Equation</option>
          </select>
        </div>
        <div class="form-field">
          <label for="param-value">
            {{ newParameter.type === 'fixed' ? 'Value' : 'Equation' }}
          </label>
          <input
            id="param-value"
            v-model="newParameter.value"
            type="text"
            class="form-input"
            :placeholder="
              newParameter.type === 'fixed'
                ? 'Enter value'
                : 'Enter equation (e.g. param1 + param2)'
            "
          />
        </div>
      </div>
      <div class="form-actions">
        <FormButton text size="sm" @click="handleCreate">Create</FormButton>
        <FormButton text size="sm" @click="$emit('cancel-add')">Cancel</FormButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FormButton } from '@speckle/ui-components'
import type { AvailableUserParameter, ParameterValue } from '~/composables/core/types'

defineProps<{
  groupName: string
  parameters: AvailableUserParameter[]
  isAddingNew: boolean
  showAddButton: boolean
  getCurrentValue: (param: AvailableUserParameter) => ParameterValue
}>()

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'cancel-add'): void
  (e: 'create', parameter: Omit<AvailableUserParameter, 'id'>): void
  (e: 'update', parameter: AvailableUserParameter): void
  (e: 'delete', parameter: AvailableUserParameter): void
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

// New parameter form state
type ParameterType = 'fixed' | 'equation'

const newParameter = ref({
  name: '',
  type: 'fixed' as ParameterType,
  value: '',
  group: 'Custom'
})

function handleCreate() {
  emit('create', {
    name: newParameter.value.name,
    type: newParameter.value.type,
    value: newParameter.value.type === 'fixed' ? newParameter.value.value : null,
    equation:
      newParameter.value.type === 'equation' ? newParameter.value.value : undefined,
    group: newParameter.value.group,
    visible: true,
    kind: 'user'
  })

  // Reset form
  newParameter.value = {
    name: '',
    type: 'fixed',
    value: '',
    group: 'Custom'
  }
}
</script>

<style scoped>
.form-grid {
  display: grid;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-field label {
  font-size: 0.875rem;
  color: var(--color-foreground-muted);
}

.form-input {
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  font-size: 0.875rem;
  background: var(--color-background);
  color: var(--color-foreground);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.parameter-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
}

.group-header {
  font-weight: 600;
  color: var(--color-foreground-muted);
  padding: 0.25rem 0;
}

.parameter-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  border-radius: 0.25rem;
  background: var(--surface-card);
}

.parameter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.parameter-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.parameter-name {
  font-weight: 500;
}

.parameter-type {
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  background: var(--color-background-muted);
  color: var(--color-foreground-muted);
}

.parameter-type.fixed {
  background: var(--color-success-muted);
  color: var(--color-success);
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

.parameter-actions {
  display: flex;
  gap: 0.25rem;
}

.add-parameter {
  padding: 0.5rem;
  border-radius: 0.25rem;
  border: 1px dashed var(--color-border);
  display: flex;
  justify-content: center;
}

.add-parameter-form {
  padding: 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid var(--color-border);
  background: var(--color-background);
}
</style>
