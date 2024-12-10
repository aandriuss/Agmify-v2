<template>
  <div
    v-show="showCategoryOptions"
    class="sticky top-10 px-2 py-2 border-b-2 border-primary-muted bg-foundation"
  >
    <div class="flex flex-row justify-between">
      <!-- Parent Categories -->
      <div class="flex-1 mr-4">
        <span class="text-body-xs text-foreground font-medium mb-2 block">
          Host Categories
        </span>
        <div class="max-h-200 overflow-y-auto">
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
              @click="handleCategoryToggle('parent', category)"
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
        <div class="max-h-200 overflow-y-auto">
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
              @click="handleCategoryToggle('child', category)"
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
import { debug, DebugCategories } from '~/composables/core/utils/debug'

const props = defineProps<{
  showCategoryOptions: boolean
  parentCategories: string[]
  childCategories: string[]
  selectedParentCategories: string[]
  selectedChildCategories: string[]
  isUpdating: boolean
  error?: Error | null
}>()

const emit = defineEmits<{
  'toggle-category': [type: 'parent' | 'child', category: string]
}>()

function handleCategoryToggle(type: 'parent' | 'child', category: string) {
  if (props.isUpdating) return

  debug.log(DebugCategories.CATEGORIES, 'Category toggle requested', {
    type,
    category,
    currentState: {
      parent: props.selectedParentCategories,
      child: props.selectedChildCategories
    }
  })

  emit('toggle-category', type, category)
}
</script>

<style scoped>
.max-h-200 {
  max-height: 200px;
}

.overflow-y-auto {
  overflow-y: auto;
}

.mb-1 {
  margin-bottom: 0.25rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.sticky {
  position: sticky;
}

.top-10 {
  top: 2.5rem;
}

.px-2 {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.py-2 {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.p-2 {
  padding: 0.5rem;
}

.border-b-2 {
  border-bottom-width: 2px;
}

.border-primary-muted {
  border-color: var(--color-primary-muted);
}

.bg-foundation {
  background-color: var(--color-foundation);
}

.bg-error-light {
  background-color: var(--color-error-light);
}

.text-error-dark {
  color: var(--color-error-dark);
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

.text-body-xs {
  font-size: 0.75rem;
  line-height: 1rem;
}

.text-foreground {
  color: var(--color-foreground);
}

.font-medium {
  font-weight: 500;
}

.rounded {
  border-radius: 0.25rem;
}

.mt-2 {
  margin-top: 0.5rem;
}

.block {
  display: block;
}

.category-button {
  width: 100%;
  text-align: left;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
}

.category-button-selected {
  background-color: var(--color-primary-light);
  color: var(--color-primary-dark);
  font-weight: 500;
}

.category-button-unselected {
  background-color: var(--color-foundation);
  color: var(--color-text-muted);
  opacity: 0.8;
}

.category-button-unselected:hover {
  background-color: var(--color-primary-muted);
  opacity: 1;
}

.category-text {
  margin-left: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
}
</style>
