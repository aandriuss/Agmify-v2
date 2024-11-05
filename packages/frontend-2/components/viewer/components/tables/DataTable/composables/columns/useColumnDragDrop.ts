import { ref, computed } from 'vue'
import type { ColumnDef, ParameterDefinition } from '../types'

export interface DragState {
  item: ColumnDef | ParameterDefinition
  sourceList: 'active' | 'available'
  sourceIndex: number
  isDragging: boolean
}

export function useColumnDragDrop() {
  // State
  const dragState = ref<DragState | null>(null)
  const dragOverIndex = ref<number | null>(null)
  const dropPosition = ref<'above' | 'below' | null>(null)
  const dragOverList = ref<'active' | 'available' | null>(null)

  // Computed states
  const isDragging = computed(() => dragState.value !== null)

  // Update drag over state with better error handling
  const updateDragOver = (
    index: number,
    list: 'active' | 'available',
    position: 'above' | 'below'
  ) => {
    try {
      if (!dragState.value) return

      console.log('Updating drag over:', {
        index,
        list,
        position,
        currentState: {
          dragOverIndex: dragOverIndex.value,
          dragOverList: dragOverList.value,
          dropPosition: dropPosition.value
        }
      })

      dragOverIndex.value = index
      dragOverList.value = list
      dropPosition.value = position
    } catch (error) {
      console.error('Error in updateDragOver:', error)
      // Reset state on error
      clearDragState()
    }
  }

  // Clear drag state
  const clearDragState = () => {
    console.log('Clearing drag state')
    dragState.value = null
    dragOverIndex.value = null
    dragOverList.value = null
    dropPosition.value = null
  }

  // Start dragging
  const startDrag = (
    item: any,
    sourceList: 'active' | 'available',
    sourceIndex: number
  ) => {
    console.log('Starting drag:', {
      item,
      sourceList,
      sourceIndex
    })

    dragState.value = {
      item,
      sourceList,
      sourceIndex,
      isDragging: true
    }
  }

  // Handle drop with validation
  const handleDrop = () => {
    if (!dragState.value || !dragOverList.value || dragOverIndex.value === null) {
      console.log('Drop action failed: Incomplete drag state or target data')
      clearDragState()
      return null
    }

    const result = {
      item: dragState.value.item,
      sourceList: dragState.value.sourceList,
      sourceIndex: dragState.value.sourceIndex,
      targetList: dragOverList.value,
      targetIndex: dragOverIndex.value,
      position: dropPosition.value
    }

    console.log('Handling drop:', result)
    console.log('Before Drop - Active Columns:', dragState.value.sourceList)

    // TODO: Add code here to update state and persist changes

    console.log('After Drop - Active Columns:', result)

    clearDragState()
    return result
  }

  return {
    // State
    dragState,
    dragOverIndex,
    dropPosition,
    isDragging,

    // Methods
    startDrag,
    updateDragOver,
    clearDragState,
    handleDrop
  }
}
