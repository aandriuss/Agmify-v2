<template>
  <div class="p-8 text-center">
    <!-- No Categories Selected State -->
    <div
      v-if="noCategoriesSelected"
      class="inline-flex flex-col items-center p-6 bg-blue-50 rounded-lg max-w-lg"
    >
      <div class="text-blue-500 mb-3">
        <span class="i-mdi-filter text-3xl"></span>
      </div>
      <h3 class="font-medium text-blue-700 text-lg">No categories selected</h3>
      <p class="mt-2 text-sm text-blue-600">
        Use the category filters above to select which elements to display in your
        schedule. You can select multiple categories to include different types of
        elements.
      </p>
      <div class="mt-4 text-sm text-blue-500">
        <span class="i-mdi-lightbulb text-lg align-text-bottom mr-1"></span>
        Tip: Start with a parent category to see available child categories
      </div>
    </div>

    <!-- Initial State -->
    <div
      v-else
      class="inline-flex flex-col items-center p-6 bg-gray-50 rounded-lg max-w-lg"
    >
      <div class="text-gray-500 mb-3">
        <span class="i-mdi-table text-3xl"></span>
      </div>
      <h3 class="font-medium text-gray-700 text-lg">
        {{
          hasTableName ? 'Creating new schedule...' : 'Get started with your schedule'
        }}
      </h3>
      <p class="mt-2 text-sm text-gray-600">
        {{
          hasTableName
            ? 'Setting up your schedule. Please wait while we prepare everything.'
            : 'Enter a name for your schedule in the header above to begin. You can then select categories and customize your view.'
        }}
      </p>
      <div v-if="!hasTableName" class="mt-4 text-sm text-gray-500">
        <span class="i-mdi-lightbulb text-lg align-text-bottom mr-1"></span>
        Tip: Use a descriptive name that reflects the purpose of your schedule
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  noCategoriesSelected: boolean
  hasTableName: boolean
}

defineProps<Props>()
</script>

<style scoped>
.i-mdi-filter,
.i-mdi-table,
.i-mdi-lightbulb {
  display: inline-block;
  width: 1.5rem;
  height: 1.5rem;
  background-color: currentColor;
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: contain;
}

.i-mdi-filter {
  mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14 12v7.88c.04.3-.06.62-.29.83a.996.996 0 0 1-1.41 0l-2.01-2.01a.989.989 0 0 1-.29-.83V12h-.03L4.21 4.62a1 1 0 0 1 .17-1.4c.19-.14.4-.22.62-.22h14c.22 0 .43.08.62.22a1 1 0 0 1 .17 1.4L14.03 12H14z"/></svg>');
}

.i-mdi-table {
  mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2m0 4v4h6V8H5m8 0v4h6V8h-6m-8 6v4h6v-4H5m8 0v4h6v-4h-6z"/></svg>');
}

.i-mdi-lightbulb {
  mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7M9 21v-1h6v1a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1m3-17a5 5 0 0 0-5 5c0 2.05 1.23 3.81 3 4.58V16h4v-2.42c1.77-.77 3-2.53 3-4.58a5 5 0 0 0-5-5z"/></svg>');
}

.max-w-lg {
  max-width: 32rem;
}

.text-3xl {
  font-size: 1.875rem;
  line-height: 2.25rem;
}

.align-text-bottom {
  vertical-align: text-bottom;
}

.p-6 {
  padding: 1.5rem;
}

.mb-3 {
  margin-bottom: 0.75rem;
}

.text-lg {
  font-size: 1.125rem;
  line-height: 1.75rem;
}

.mr-1 {
  margin-right: 0.25rem;
}
</style>
