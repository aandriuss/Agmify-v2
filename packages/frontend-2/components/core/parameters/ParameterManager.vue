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
          <ParameterList
            :parameters="group.parameters"
            :is-selected="isParameterSelected"
            :is-visible="getParameterVisibility"
            :nested-parameters="nestedParametersMap"
            @visibility-change="toggleParameterVisibility"
            @toggle-nested="toggleNestedVisibility"
          />
        </div>

        <!-- User Parameters -->
        <div v-if="userParameters.length > 0" class="parameter-group">
          <div class="group-header">
            <h3 class="group-title">User Parameters</h3>
            <span class="parameter-count">{{ userParameters.length }}</span>
          </div>

          <div class="parameters-list">
            <template v-for="parameter in userParameters" :key="parameter.id">
              <div
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
            </template>
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
import { CheckCircleIcon, PlusIcon, PencilIcon } from '@heroicons/vue/24/solid'
import { CheckCircleIcon as CheckCircleIconOutlined } from '@heroicons/vue/24/outline'
import type {
  AvailableBimParameter,
  AvailableUserParameter,
  SelectedParameter
} from '~/composables/core/types/parameters/parameter-states'
import LoadingState from '~/components/core/LoadingState.vue'
import ParameterList from './ParameterList.vue'

interface ExtendedBimParameter extends AvailableBimParameter {
  showNested?: boolean
}

interface ParameterGroup {
  name: string
  parameters: ExtendedBimParameter[]
}

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
  availableParentParameters: {
    type: Array as PropType<AvailableBimParameter[]>,
    required: true
  },
  availableChildParameters: {
    type: Array as PropType<AvailableBimParameter[]>,
    required: true
  },
  selectedParentParameters: {
    type: Array as PropType<SelectedParameter[]>,
    required: true
  },
  selectedChildParameters: {
    type: Array as PropType<SelectedParameter[]>,
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

// Track nested parameter visibility
const nestedVisibility = ref(new Set<string>())

// Loading and error states
const isLoading = ref(false)
const error = ref<Error | null>(null)

// Group BIM parameters by source group with nested structure
const parameterGroups = computed<ParameterGroup[]>(() => {
  const groups = new Map<string, ParameterGroup>()

  // First pass: Group parent BIM parameters
  const parentParams = props.availableParentParameters
  if (parentParams) {
    parentParams.forEach((param) => {
      const group = param.fetchedGroup
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
  }

  // Sort parameters within each group
  groups.forEach((group) => {
    group.parameters.sort((a, b) => a.name.localeCompare(b.name))
  })

  return Array.from(groups.values())
})

// Create map of nested parameters
const nestedParametersMap = computed(() => {
  const map: Record<string, ExtendedBimParameter[]> = {}

  props.availableParentParameters?.forEach((param) => {
    if (param.metadata?.isNested && param.metadata.parentKey) {
      if (!map[param.metadata.parentKey]) {
        map[param.metadata.parentKey] = []
      }
      map[param.metadata.parentKey].push({
        ...param,
        showNested: nestedVisibility.value.has(param.id)
      })
    }
  })

  // Sort nested parameters
  Object.values(map).forEach((params) => {
    params.sort((a, b) => a.name.localeCompare(b.name))
  })

  return map
})

// Get user parameters
const userParameters = computed<AvailableUserParameter[]>(() => []) // We'll handle user parameters later

// Methods
function isParameterSelected(
  parameter: AvailableBimParameter | AvailableUserParameter
): boolean {
  return props.selectedParentParameters.some((p) => p.id === parameter.id)
}

function getParameterVisibility(
  parameter: AvailableBimParameter | AvailableUserParameter
): boolean {
  const selected = props.selectedParentParameters.find((p) => p.id === parameter.id)
  return selected?.visible ?? true
}

function toggleParameterVisibility(
  parameter: AvailableBimParameter | AvailableUserParameter
) {
  try {
    const selected = props.selectedParentParameters.find((p) => p.id === parameter.id)
    if (selected) {
      emit('parameter-visibility-change', {
        ...selected,
        visible: !selected.visible
      })
    }
  } catch (err) {
    const error =
      err instanceof Error ? err : new Error('Failed to update parameter visibility')
    emit('error', error)
  }
}

function toggleNestedVisibility(parameter: ExtendedBimParameter) {
  if (nestedVisibility.value.has(parameter.id)) {
    nestedVisibility.value.delete(parameter.id)
  } else {
    nestedVisibility.value.add(parameter.id)
  }
}

function editUserParameter(parameter: AvailableUserParameter) {
  const selected = props.selectedParentParameters.find((p) => p.id === parameter.id)
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
