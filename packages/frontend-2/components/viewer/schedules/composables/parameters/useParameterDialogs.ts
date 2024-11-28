import { ref } from 'vue'

export interface DialogState {
  showEdit: boolean
  showTableSelection: boolean
  error: string | null
}

interface UseParameterDialogsOptions {
  onError?: (error: string) => void
}

export function useParameterDialogs(options: UseParameterDialogsOptions = {}) {
  const state = ref<DialogState>({
    showEdit: false,
    showTableSelection: false,
    error: null
  })

  const closeAll = () => {
    state.value.showEdit = false
    state.value.showTableSelection = false
    state.value.error = null
  }

  const setError = (error: string | null) => {
    state.value.error = error
    if (error && options.onError) {
      options.onError(error)
    }
  }

  return {
    state,
    closeAll,
    setError,
    openEdit: () => {
      state.value.showEdit = true
    },
    closeEdit: () => {
      state.value.showEdit = false
    },
    openTableSelection: () => {
      state.value.showTableSelection = true
    },
    closeTableSelection: () => {
      state.value.showTableSelection = false
    }
  }
}
