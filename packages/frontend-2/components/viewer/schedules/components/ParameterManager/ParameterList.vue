<template>
  <div class="space-y-4">
    <div
      class="flex justify-between items-center cursor-pointer"
      @click="isExpanded = !isExpanded"
    >
      <div class="flex items-center gap-2">
        <h3 class="text-lg font-medium">{{ groupName }}</h3>
        <span class="text-sm text-gray-500">({{ parameters.length }})</span>
        <ChevronDownIcon v-if="isExpanded" class="h-5 w-5 text-gray-500" />
        <ChevronRightIcon v-else class="h-5 w-5 text-gray-500" />
      </div>
      <FormButton
        v-if="showAddButton"
        text
        size="sm"
        color="primary"
        @click.stop="$emit('add')"
      >
        Add Parameter
      </FormButton>
    </div>

    <div v-show="isExpanded">
      <div v-if="parameters.length === 0" class="text-center text-gray-500 py-4">
        No parameters in this group
      </div>

      <DataTable
        v-else
        :value="sortedParameters"
        :row-hover="true"
        class="p-datatable-sm"
        style="width: 100%"
      >
        <Column field="name" header="Name">
          <template #body="{ data }">
            <span class="font-medium">{{ data.name }}</span>
          </template>
        </Column>

        <Column field="type" header="Type">
          <template #body="{ data }">
            <span class="capitalize">{{ data.type }}</span>
          </template>
        </Column>

        <Column field="value" header="Value/Equation">
          <template #body="{ data }">
            <span v-if="data.type === 'fixed'">{{ data.value }}</span>
            <span v-else>{{ data.equation }}</span>
          </template>
        </Column>

        <Column field="currentValue" header="Current Value">
          <template #body="{ data }">
            <span>{{ getCurrentValue(data) }}</span>
          </template>
        </Column>

        <Column header="Actions" style="width: 150px">
          <template #body="{ data }">
            <div class="flex gap-2">
              <FormButton text size="sm" color="primary" @click="$emit('edit', data)">
                Edit
              </FormButton>
              <FormButton text size="sm" color="danger" @click="handleDelete(data)">
                Delete
              </FormButton>
              <FormButton
                text
                size="sm"
                color="primary"
                @click="$emit('add-to-tables', data)"
              >
                Tables
              </FormButton>
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/vue/24/solid'
import { useParameterOperations } from '~/composables/settings/useParameterOperations'
import { useUserSettings } from '~/composables/useUserSettings'
import type { CustomParameter } from '~/composables/core/types'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const props = defineProps<{
  groupName: string
  parameters: CustomParameter[]
  showAddButton?: boolean
  getCurrentValue: (parameter: CustomParameter) => string
}>()

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'edit', parameter: CustomParameter): void
  (e: 'delete', parameter: CustomParameter): void
  (e: 'add-to-tables', parameter: CustomParameter): void
}>()

const isExpanded = ref(true)

// Initialize settings
const { settings, loadSettings, saveSettings } = useUserSettings()

// Initialize parameter operations
const { deleteParameter } = useParameterOperations({
  settings,
  saveSettings: async (updatedSettings) => {
    try {
      await saveSettings(updatedSettings)
      return true
    } catch (err) {
      console.error('Failed to save settings:', err)
      return false
    }
  }
})

const sortedParameters = computed(() => {
  return [...props.parameters].sort((a, b) => a.name.localeCompare(b.name))
})

const handleDelete = async (parameter: CustomParameter) => {
  try {
    await deleteParameter(parameter.id)
    emit('delete', parameter)
  } catch (err) {
    console.error('Failed to delete parameter:', err)
  }
}
</script>
