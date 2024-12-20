<template>
  <div class="parameter-manager">
    <!-- Loading State -->
    <LoadingState
      :is-loading="isLoading"
      :error="error"
      loading-message="Loading parameters..."
    >
      <!-- Parameter Groups -->
      <div class="parameter-groups">
        <!-- BIM Parameters -->
        <div v-for="group in parameterGroups" :key="group.name" class="parameter-group">
          <div class="group-header">
            <h3 class="group-title">{{ group.name }}</h3>
            <span class="parameter-count">{{ group.parameters.length }}</span>
          </div>

          <!-- Parameters List -->
          <div class="parameters-list">
            <div
              v-for="parameter in group.parameters"
              :key="parameter.id"
              class="parameter-item"
              :class="{
                'is-selected': isParameterSelected(parameter),
                'is-visible': getParameterVisibility(parameter),
                'has-nested': parameter.nested?.length
              }"
            >
              <!-- Main Parameter -->
              <div class="parameter-row">
                <FormButton
                  text
                  size="sm"
                  :icon-left="
                    getParameterVisibility(parameter)
                      ? CheckCircleIcon
                      : CheckCircleIconOutlined
                  "
                  @click="toggleParameterVisibility(parameter)"
                >
                  {{ parameter.name }}
                </FormButton>

                <!-- Parameter Type Badge -->
                <span class="parameter-type" :class="parameter.type">
                  {{ parameter.type }}
                </span>

                <!-- Nested Parameters Indicator -->
                <FormButton
                  v-if="parameter.nested?.length"
                  text
                  size="sm"
                  :icon-left="parameter.showNested ? ChevronUpIcon : ChevronDownIcon"
                  @click="toggleNestedVisibility(parameter)"
                />
              </div>

              <!-- Nested Parameters -->
              <div
                v-if="parameter.nested?.length && parameter.showNested"
                class="nested-parameters"
              >
                <div
                  v-for="nestedParam in parameter.nested"
                  :key="nestedParam.id"
                  class="parameter-item nested"
                  :class="{
                    'is-selected': isParameterSelected(nestedParam),
                    'is-visible': getParameterVisibility(nestedParam)
                  }"
                >
                  <FormButton
                    text
                    size="sm"
                    :icon-left="
                      getParameterVisibility(nestedParam)
                        ? CheckCircleIcon
                        : CheckCircleIconOutlined
                    "
                    @click="toggleParameterVisibility(nestedParam)"
                  >
                    {{ nestedParam.name }}
                  </FormButton>

                  <!-- Parameter Type Badge -->
                  <span class="parameter-type" :class="nestedParam.type">
                    {{ nestedParam.type }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- User Parameters -->
        <div v-if="userParameters.length > 0" class="parameter-group">
          <div class="group-header">
            <h3 class="group-title">User Parameters</h3>
            <span class="parameter-count">{{ userParameters.length }}</span>
          </div>

          <div class="parameters-list">
            <div
              v-for="parameter in userParameters"
              :key="parameter.id"
              class="parameter-item"
              :class="{
                'is-selected': isParameterSelected(parameter),
                'is-visible': getParameterVisibility(parameter)
              }"
            >
              <FormButton
                text
                size="sm"
                :icon-left="
                  getParameterVisibility(parameter)
                    ? CheckCircleIcon
                    : CheckCircleIconOutlined
                "
                @click="toggleParameterVisibility(parameter)"
              >
                {{ parameter.name }}
              </FormButton>

              <!-- Parameter Type Badge -->
              <span class="parameter-type" :class="parameter.type">
                {{ parameter.type }}
              </span>

              <!-- Edit Button for User Parameters -->
              <FormButton
                text
                size="sm"
                :icon-left="PencilIcon"
                @click="editUserParameter(parameter)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="parameter-actions">
        <FormButton
          v-if="canCreateParameters"
          primary
          size="sm"
          :icon-left="PlusIcon"
          @click="createParameter"
        >
          Add Parameter
        </FormButton>
      </div>
    </LoadingState>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PropType } from 'vue'
import {
  CheckCircleIcon,
  PlusIcon,
  PencilIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/vue/24/solid'
import { CheckCircleIcon as CheckCircleIconOutlined } from '@heroicons/vue/24/outline'
import type {
  AvailableBimParameter,
  AvailableUserParameter,
  SelectedParameter
} from '~/composables/core/types/parameters/parameter-states'
import { useParameters } from '~/composables/core/parameters/next/useParameters'
import LoadingState from '~/components/core/LoadingState.vue'

// Props
const props = defineProps({
  selectedParentCategories: {
    type: Array as PropType<string[]>,
    required: true
  },
  selectedChildCategories: {
    type: Array as PropType<string[]>,
    required: true
  },
  canCreateParameters: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits<{
  (e: 'parameter-visibility-change', parameter: SelectedParameter): void
  (e: 'parameter-edit', parameter: SelectedParameter): void
  (e: 'parameter-create'): void
  (e: 'error', error: Error): void
}>()

// Initialize parameter management
const parameters = useParameters({
  selectedParentCategories: computed(() => props.selectedParentCategories),
  selectedChildCategories: computed(() => props.selectedChildCategories)
})

// Track nested parameter visibility
const nestedVisibility = ref(new Set<string>())

// Computed properties
const isLoading = computed(() => parameters.isProcessing.value)
const error = computed(() =>
  parameters.hasError.value ? new Error('Failed to load parameters') : null
)

// Group BIM parameters by source group with nested structure
const parameterGroups = computed(() => {
  const groups = new Map<
    string,
    {
      name: string
      parameters: (AvailableBimParameter & {
        nested?: AvailableBimParameter[]
        showNested?: boolean
      })[]
    }
  >()

  // First pass: Group parent BIM parameters
  parameters.parentParameters.available.bim.value.forEach((param) => {
    const group = param.sourceGroup
    if (!groups.has(group)) {
      groups.set(group, { name: group, parameters: [] })
    }

    // Skip nested parameters in first pass
    if (!param.metadata?.isNested) {
      groups.get(group)!.parameters.push({
        ...param,
        showNested: nestedVisibility.value.has(param.id)
      })
    }
  })

  // Second pass: Add nested parameters to their parents
  parameters.parentParameters.available.bim.value.forEach((param) => {
    if (param.metadata?.isNested && param.metadata.parentKey) {
      const group = param.sourceGroup
      const parentParam = groups
        .get(group)
        ?.parameters.find((p) => p.id === param.metadata?.parentKey)
      if (parentParam) {
        if (!parentParam.nested) parentParam.nested = []
        parentParam.nested.push(param)
      }
    }
  })

  // Sort parameters within each group
  groups.forEach((group) => {
    // Sort main parameters
    group.parameters.sort((a, b) => a.name.localeCompare(b.name))
    // Sort nested parameters
    group.parameters.forEach((param) => {
      if (param.nested) {
        param.nested.sort((a, b) => a.name.localeCompare(b.name))
      }
    })
  })

  return Array.from(groups.values())
})

// Get user parameters
const userParameters = computed(() => parameters.parentParameters.available.user.value)

// Methods
function isParameterSelected(
  parameter: AvailableBimParameter | AvailableUserParameter
): boolean {
  return parameters.parentParameters.selected.value.some((p) => p.id === parameter.id)
}

function getParameterVisibility(
  parameter: AvailableBimParameter | AvailableUserParameter
): boolean {
  const selected = parameters.parentParameters.selected.value.find(
    (p) => p.id === parameter.id
  )
  return selected?.visible ?? true
}

function toggleParameterVisibility(
  parameter: AvailableBimParameter | AvailableUserParameter
) {
  try {
    const selected = parameters.parentParameters.selected.value.find(
      (p) => p.id === parameter.id
    )
    if (selected) {
      parameters.updateParameterVisibility(parameter.id, !selected.visible, true)
      emit('parameter-visibility-change', {
        ...selected,
        visible: !selected.visible
      })
    }
  } catch (error) {
    if (error instanceof Error) {
      emit('error', error)
    } else {
      emit('error', new Error('Failed to update parameter visibility'))
    }
  }
}

function toggleNestedVisibility(
  parameter: AvailableBimParameter & { showNested?: boolean }
) {
  if (nestedVisibility.value.has(parameter.id)) {
    nestedVisibility.value.delete(parameter.id)
  } else {
    nestedVisibility.value.add(parameter.id)
  }
}

function editUserParameter(parameter: AvailableUserParameter) {
  const selected = parameters.parentParameters.selected.value.find(
    (p) => p.id === parameter.id
  )
  if (selected) {
    emit('parameter-edit', selected)
  }
}

function createParameter() {
  emit('parameter-create')
}
</script>

<style scoped>
.parameter-manager {
  padding: 1rem;
}

.parameter-groups {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.parameter-group {
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 1rem;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.group-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-foreground);
}

.parameter-count {
  font-size: 0.75rem;
  color: var(--color-foreground-muted);
  background: var(--color-background-muted);
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
}

.parameters-list {
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

.parameter-item.nested {
  padding-left: 0.5rem;
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

.parameter-actions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
}
</style>
