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
        <div class="max-h-[200px] overflow-y-auto">
          <div v-for="category in parentCategories" :key="category">
            <FormButton
              size="sm"
              :icon-left="
                selectedParentCategories.includes(category)
                  ? CheckCircleIconSolid
                  : CheckCircleIconOutline
              "
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
        </span>
        <div class="max-h-[200px] overflow-y-auto">
          <div v-for="category in childCategories" :key="category">
            <FormButton
              size="sm"
              :icon-left="
                selectedChildCategories.includes(category)
                  ? CheckCircleIconSolid
                  : CheckCircleIconOutline
              "
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
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/vue/24/solid'
import { CheckCircleIcon as CheckCircleIconOutline } from '@heroicons/vue/24/outline'
import { debug, DebugCategories } from '../utils/debug'

const props = defineProps<{
  showCategoryOptions: boolean
  parentCategories: string[]
  childCategories: string[]
  selectedParentCategories: string[]
  selectedChildCategories: string[]
  isInitialized: boolean
}>()

const emit = defineEmits<{
  'toggle-category': [type: 'parent' | 'child', category: string]
}>()

function handleCategoryToggle(type: 'parent' | 'child', category: string) {
  debug.log(DebugCategories.CATEGORIES, 'Toggle requested', {
    type,
    category,
    currentState: {
      selectedParent: props.selectedParentCategories,
      selectedChild: props.selectedChildCategories
    }
  })

  emit('toggle-category', type, category)

  debug.log(DebugCategories.CATEGORIES, 'Toggle event emitted')
}
</script>
