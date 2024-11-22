<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto py-6 px-4">
      <div class="bg-white rounded-lg shadow">
        <div class="p-6 border-b border-gray-200">
          <h1 class="text-2xl font-semibold text-gray-900">Schedule Test Page</h1>
          <p class="mt-1 text-sm text-gray-500">
            Testing DataTable with dummy BIM element data
          </p>
        </div>

        <!-- Test Component -->
        <TestDataTable />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TestDataTable from '../components/test/TestDataTable.vue'
</script>

<style scoped>
.min-h-screen {
  min-height: 100vh;
}

.max-w-7xl {
  max-width: 80rem;
}

.mx-auto {
  margin-left: auto;
  margin-right: auto;
}

.py-6 {
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
}

.px-4 {
  padding-left: 1rem;
  padding-right: 1rem;
}

.bg-white {
  background-color: #fff;
}

.bg-gray-50 {
  background-color: #f9fafb;
}

.rounded-lg {
  border-radius: 0.5rem;
}

.shadow {
  box-shadow: 0 1px 3px rgb(0 0 0 / 10%), 0 1px 2px rgb(0 0 0 / 6%);
}

.border-b {
  border-bottom-width: 1px;
}

.border-gray-200 {
  border-color: #e5e7eb;
}

.text-2xl {
  font-size: 1.5rem;
  line-height: 2rem;
}

.font-semibold {
  font-weight: 600;
}

.text-gray-900 {
  color: #111827;
}

.mt-1 {
  margin-top: 0.25rem;
}

.text-sm {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.text-gray-500 {
  color: #6b7280;
}
</style>
