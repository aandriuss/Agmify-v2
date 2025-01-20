<template>
  <div class="parameter-item">
    <div class="parameter-row">
      <div class="parameter-info">
        <div class="parameter-name-type-wrapper">
          <input
            id="parameter-name-input"
            v-model="newParameter.name"
            type="text"
            class="form-input parameter-name-input"
            placeholder="Parameter name"
            aria-labelledby="parameter-name-label"
          />
          <select
            id="parameter-type-input"
            v-model="newParameter.type"
            class="form-input parameter-type-input"
            aria-labelledby="parameter-type-label"
          >
            <option value="fixed">Fixed Value</option>
            <option value="equation">Equation</option>
          </select>
        </div>
        <input
          id="parameter-value-input"
          v-model="newParameter.value"
          type="text"
          class="form-input parameter-value-input"
          :placeholder="
            newParameter.type === 'fixed'
              ? 'Enter value'
              : 'Enter equation (e.g. param1 + param2)'
          "
          aria-labelledby="parameter-value-label"
        />
        <input
          id="parameter-group-input"
          v-model="newParameter.group.currentGroup"
          type="text"
          class="form-input parameter-group-input"
          placeholder="Enter group name"
          aria-labelledby="parameter-group-label"
        />
      </div>
      <div class="parameter-actions">
        <FormButton text size="sm" @click="handleCreate">
          <CheckIcon class="size-4" />
        </FormButton>
        <FormButton text size="sm" @click="$emit('cancel')">
          <XMarkIcon class="size-4" />
        </FormButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FormButton } from '@speckle/ui-components'
import { CheckIcon, XMarkIcon } from '@heroicons/vue/24/solid'
import type { AvailableUserParameter } from '~/composables/core/types'

type ParameterType = 'fixed' | 'equation'

const emit = defineEmits<{
  (e: 'create', parameter: Omit<AvailableUserParameter, 'id'>): void
  (e: 'cancel'): void
}>()

const newParameter = ref({
  name: '',
  type: 'fixed' as ParameterType,
  value: '',
  group: {
    fetchedGroup: 'AgmifyUserParameters',
    currentGroup: 'Custom'
  }
})

function handleCreate() {
  const name = newParameter.value.name
  const group = {
    fetchedGroup: 'AgmifyUserParameters',
    currentGroup: newParameter.value.group.currentGroup || 'Custom'
  }

  emit('create', {
    name,
    type: newParameter.value.type,
    value: newParameter.value.type === 'fixed' ? newParameter.value.value : null,
    equation:
      newParameter.value.type === 'equation' ? newParameter.value.value : undefined,
    group,
    visible: true,
    kind: 'user',
    field: name.toLowerCase().replace(/\s+/g, '_'),
    header: name,
    removable: true
  })

  // Reset form
  newParameter.value = {
    name: '',
    type: 'fixed',
    value: '',
    group: {
      fetchedGroup: 'AgmifyUserParameters',
      currentGroup: 'Custom'
    }
  }
}
</script>

<style scoped>
.parameter-item {
  background: var(--surface-card);
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  transition: all 0.2s ease;
}

.parameter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  width: 100%;
  padding: 0.5rem;
}

.parameter-info {
  display: grid;
  grid-template-columns: minmax(180px, 1.4fr) minmax(150px, 2fr) minmax(120px, 1fr);
  gap: 1rem;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.parameter-name-type-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
  position: relative;
}

.form-input {
  font-size: small;
  padding: 0.1rem;
  padding-left: 0.5rem;
  border-radius: 0.375rem;
  background: var(--color-background);
  color: var(--color-foreground);
  width: 100%;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-muted);
}

.parameter-name-input {
  max-width: 500px;
}

.parameter-type-input {
  max-width: 100px;
}

.parameter-value-input,
.parameter-group-input {
  min-width: 0;
  width: 100%;
}

.parameter-actions {
  display: flex;
  gap: 0.5rem;
  margin-left: 1rem;
}
</style>
