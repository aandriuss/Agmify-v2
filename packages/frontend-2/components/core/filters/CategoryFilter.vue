<template>
  <div class="category-filter">
    <div v-if="categories.length">
      <h3 class="text-sm font-medium mb-2">Categories</h3>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="category in categories"
          :key="category"
          class="px-3 py-1 rounded-full text-sm transition-colors"
          :class="[
            selectedCategories.includes(category)
              ? 'bg-foundation-2 text-primary-focus'
              : 'bg-foundation text-gray-700 hover:bg-gray-200'
          ]"
          @click="handleCategoryToggle(category)"
        >
          {{ category }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  categories: string[]
  selectedCategories: string[]
}

interface Emits {
  (e: 'update:selectedCategories', categories: string[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

function handleCategoryToggle(category: string): void {
  const index = props.selectedCategories.indexOf(category)
  const newCategories = [...props.selectedCategories]

  if (index === -1) {
    newCategories.push(category)
  } else {
    newCategories.splice(index, 1)
  }

  emit('update:selectedCategories', newCategories)
}
</script>

<style scoped>
.category-filter {
  @apply mt-4;
}
</style>
