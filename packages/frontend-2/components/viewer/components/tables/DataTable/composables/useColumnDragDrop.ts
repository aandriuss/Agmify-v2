import { ref } from 'vue'
import type { ColumnDef, ParameterDefinition } from '../composables/types'

interface DraggedItem {
  item: ColumnDef | ParameterDefinition
  source: 'available' | 'active'
  index?: number
}

export function useColumnDragDrop() {
  const dragOverIndex = ref(-1)
  const draggedItem = ref<DraggedItem | null>(null)

  const resetDragState = () => {
    draggedItem.value = null
    dragOverIndex.value = -1
  }

  const handleDragStart = (
    event: DragEvent,
    item: ColumnDef | ParameterDefinition,
    source: 'available' | 'active',
    index?: number
  ) => {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', JSON.stringify(item))
      draggedItem.value = { item, source, index }
    }
  }

  const handleDragEnter = (event: DragEvent, index: number) => {
    if (draggedItem.value?.source === 'active') {
      dragOverIndex.value = index
    }
  }

  const handleDropToActive = (
    event: DragEvent,
    columns: ColumnDef[],
    onAdd: (param: ParameterDefinition) => void,
    onReorder: (fromIndex: number, toIndex: number) => void
  ) => {
    const dropIndex = dragOverIndex.value

    if (draggedItem.value) {
      const { item, source, index: dragIndex } = draggedItem.value

      if (source === 'available') {
        if (dropIndex >= 0) {
          onAdd(item as ParameterDefinition)
        }
      } else if (
        source === 'active' &&
        typeof dragIndex === 'number' &&
        dropIndex >= 0
      ) {
        onReorder(dragIndex, dropIndex)
      }
    }

    resetDragState()
  }

  const handleDropToAvailable = (
    event: DragEvent,
    onRemove: (column: ColumnDef) => void
  ) => {
    if (draggedItem.value?.source === 'active') {
      const item = draggedItem.value.item as ColumnDef
      if (item.removable) {
        onRemove(item)
      }
    }
    resetDragState()
  }

  return {
    dragOverIndex,
    draggedItem,
    resetDragState,
    handleDragStart,
    handleDragEnter,
    handleDropToActive,
    handleDropToAvailable
  }
}
