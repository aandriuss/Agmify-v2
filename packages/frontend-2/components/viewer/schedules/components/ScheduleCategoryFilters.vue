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
          <span v-if="!isInitialized" class="text-warning-default text-xs">
            (Loading...)
          </span>
        </span>
        <div class="max-h-[200px] overflow-y-auto">
          <div v-for="category in parentCategories" :key="category">
            <FormButton
              size="sm"
              :icon-left="
                selectedParentCategories.includes(category)
                  ? CheckCircleIcon
                  : CheckCircleIconOutlined
              "
              :disabled="!isInitialized"
              text
              @click="handleCategoryToggle('parent', category)"
            >
              {{ category }}
            </FormButton>
          </div>
        </div>
      </div>

      <!-- Child Categories -->
      <div class="flex-1">
        <span class="text-body-xs text-foreground font-medium mb-2 block">
          Child Categories
          <span v-if="!isInitialized" class="text-warning-default text-xs">
            (Loading...)
          </span>
        </span>
        <div class="max-h-[200px] overflow-y-auto">
          <div v-for="category in childCategories" :key="category">
            <FormButton
              size="sm"
              :icon-left="
                selectedChildCategories.includes(category)
                  ? CheckCircleIcon
                  : CheckCircleIconOutlined
              "
              :disabled="!isInitialized"
              text
              @click="handleCategoryToggle('child', category)"
            >
              {{ category }}
            </FormButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FormButton } from '@speckle/ui-components'
import {
  CheckCircleIcon,
  CheckCircleIcon as CheckCircleIconOutlined
} from '@heroicons/vue/24/solid'
import { watch } from 'vue'
import { debug } from '../utils/debug'

const props = defineProps<{
  showCategoryOptions: boolean
  parentCategories: string[]
  childCategories: string[]
  selectedParentCategories: string[]
  selectedChildCategories: string[]
  isInitialized: boolean
}>()

// Watch for changes in props
watch(
  () => props.parentCategories,
  (newCategories) => {
    debug.log('[CategoryFilters] Parent categories updated:', {
      categories: newCategories,
      timestamp: new Date().toISOString()
    })
  },
  { immediate: true }
)

watch(
  () => props.childCategories,
  (newCategories) => {
    debug.log('[CategoryFilters] Child categories updated:', {
      categories: newCategories,
      timestamp: new Date().toISOString()
    })
  },
  { immediate: true }
)

watch(
  () => props.selectedParentCategories,
  (newSelected) => {
    debug.log('[CategoryFilters] Selected parent categories updated:', {
      selected: newSelected,
      timestamp: new Date().toISOString()
    })
  },
  { immediate: true }
)

watch(
  () => props.selectedChildCategories,
  (newSelected) => {
    debug.log('[CategoryFilters] Selected child categories updated:', {
      selected: newSelected,
      timestamp: new Date().toISOString()
    })
  },
  { immediate: true }
)

const emit = defineEmits<{
  'toggle-category': [type: 'parent' | 'child', category: string]
}>()

function handleCategoryToggle(type: 'parent' | 'child', category: string) {
  debug.log('[CategoryFilters] Toggle requested:', {
    type,
    category,
    currentState: {
      selectedParent: props.selectedParentCategories,
      selectedChild: props.selectedChildCategories
    },
    isInitialized: props.isInitialized,
    timestamp: new Date().toISOString()
  })

  emit('toggle-category', type, category)

  debug.log('[CategoryFilters] Toggle event emitted')
}
</script>
