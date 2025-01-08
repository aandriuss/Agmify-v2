<template>
  <div class="category-menu">
    <div class="flex flex-row justify-between">
      <!-- Parent Categories -->
      <div class="flex-1 mr-4">
        <span class="text-body-xs text-foreground font-medium mb-2 block">
          Host Categories
        </span>
        <div class="max-h-[200px] overflow-y-auto">
          <div v-for="category in parentCategories" :key="category" class="mb-1">
            <FormButton
              size="sm"
              class="category-button"
              :class="{
                'category-button-selected': selectedParentCategories.includes(category),
                'category-button-unselected':
                  !selectedParentCategories.includes(category)
              }"
              :variant="
                selectedParentCategories.includes(category) ? 'primary' : 'secondary'
              "
              :icon-left="
                selectedParentCategories.includes(category)
                  ? CheckCircleIconSolid
                  : CheckCircleIconOutline
              "
              :disabled="isUpdating"
              @click="() => handleCategoryToggle('parent', category)"
            >
              <span class="category-text">{{ category }}</span>
            </FormButton>
          </div>
        </div>
      </div>

      <!-- Child Categories -->
      <div class="flex-1">
        <span class="text-body-xs text-foreground font-medium mb-2 block">
          Child Categories
        </span>
        <div class="max-h-[200px] overflow-y-auto">
          <div v-for="category in childCategories" :key="category" class="mb-1">
            <FormButton
              size="sm"
              class="category-button"
              :class="{
                'category-button-selected': selectedChildCategories.includes(category),
                'category-button-unselected':
                  !selectedChildCategories.includes(category)
              }"
              :variant="
                selectedChildCategories.includes(category) ? 'primary' : 'secondary'
              "
              :icon-left="
                selectedChildCategories.includes(category)
                  ? CheckCircleIconSolid
                  : CheckCircleIconOutline
              "
              :disabled="isUpdating"
              @click="() => handleCategoryToggle('child', category)"
            >
              <span class="category-text">{{ category }}</span>
            </FormButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div
      v-if="error"
      class="mt-2 p-2 bg-error-light text-error-dark rounded text-body-xs"
    >
      {{ error.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { FormButton } from '@speckle/ui-components'
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/vue/24/solid'
import { CheckCircleIcon as CheckCircleIconOutline } from '@heroicons/vue/24/outline'
import { useTableCategories } from '~/composables/core/tables/categories/useTableCategories'
import { parentCategories, childCategories } from '~/composables/core/config/categories'
import { watch } from 'vue'

const props = defineProps<{
  isUpdating?: boolean
  error?: Error | null
  selectedParentCategories: string[]
  selectedChildCategories: string[]
}>()

const emit = defineEmits<{
  (e: 'update', payload: { type: 'parent' | 'child'; categories: string[] }): void
}>()

// Initialize categories with reactive props
const { selectedParentCategories, selectedChildCategories, handleCategoryToggle, loadCategories } =
  useTableCategories({
    initialState: {
      selectedParentCategories: props.selectedParentCategories,
      selectedChildCategories: props.selectedChildCategories
    },
    onUpdate: (state) => {
      emit('update', {
        type: 'parent',
        categories: state.selectedParentCategories
      })
      emit('update', {
        type: 'child',
        categories: state.selectedChildCategories
      })
      return Promise.resolve()
    }
  })

// Watch for prop changes and update internal state
watch(
  () => [props.selectedParentCategories, props.selectedChildCategories],
  ([newParent, newChild]) => {
    loadCategories(newParent, newChild)
  },
  { immediate: true }
)
</script>

<style scoped>
.category-menu {
  background-color: var(--surface-card);
  padding: 0.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgb(0 0 0 / 10%);
}

.category-button {
  width: 100%;
  text-align: left;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  transition: background-color 0.2s;
  border-radius: 0.25rem;
  margin-bottom: 0.25rem;
}

.category-button-selected {
  background-color: var(--surface-section);
  color: var(--text-color);
  font-weight: 600;
}

.category-button-unselected {
  background-color: var(--surface-card);
  color: var(--text-color);
  opacity: 0.8;
}

.category-button-unselected:hover {
  background-color: var(--surface-hover);
  opacity: 1;
}

.category-text {
  margin-left: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.max-h-200 {
  max-height: 200px;
  overflow-y: auto;
}

.flex {
  display: flex;
}

.flex-row {
  flex-direction: row;
}

.flex-1 {
  flex: 1 1 0%;
}

.mr-4 {
  margin-right: 1rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.text-body-xs {
  font-size: 0.75rem;
  line-height: 1rem;
  color: var(--text-color);
  font-weight: 600;
}

.error-message {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: var(--surface-section);
  color: var(--text-color);
  border-radius: 0.25rem;
  border: 1px solid var(--surface-border);
}
</style>
