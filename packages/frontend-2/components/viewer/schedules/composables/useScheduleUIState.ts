import { ref } from 'vue'

export function useScheduleUIState() {
  const showCategoryOptions = ref(false)
  const showParameterManager = ref(false)

  const toggleCategoryOptions = () => {
    showCategoryOptions.value = !showCategoryOptions.value
  }

  const toggleParameterManager = () => {
    showParameterManager.value = !showParameterManager.value
  }

  return {
    showCategoryOptions,
    showParameterManager,
    toggleCategoryOptions,
    toggleParameterManager
  }
}
