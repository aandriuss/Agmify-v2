import { ref, computed } from 'vue'
import type { ColumnDef, ParameterDefinition } from '../types'

export interface DragItem {
  item: ColumnDef | ParameterDefinition
  sourceList: 'active' | 'available'
  sourceIndex: number
}

export interface DropResult {
  item: ColumnDef | ParameterDefinition
  sourceList: 'active' | 'available'
  targetList: 'active' | 'available'
  sourceIndex: number
  targetIndex: number
  position: 'above' | 'below'
}

export function useColumnDragDrop() {
  // State
  const dragItem = ref<DragItem | null>(null)
  const dragOverIndex = ref<number | null>(null)
  const dropPosition = ref<'above' | 'below' | null>(null)

  // Computed
  const isDragging = computed(() => dragItem.value !== null)
  const canDrop = computed(
    () =>
      dragItem.value !== null &&
      dragOverIndex.value !== null &&
      dropPosition.value !== null
  )

  // Methods
  function startDrag(
    item: ColumnDef | ParameterDefinition,
    sourceList: 'active' | 'available',
    sourceIndex: number
  ) {
    dragItem.value = { item, sourceList, sourceIndex }
  }

  function updateDragOver(index: number, position: 'above' | 'below') {
    dragOverIndex.value = index
    dropPosition.value = position
  }

  function clearDragState() {
    dragItem.value = null
    dragOverIndex.value = null
    dropPosition.value = null
  }

  function processDrop(
    targetList: 'active' | 'available',
    targetIndex: number
  ): DropResult | null {
    if (!dragItem.value || dragOverIndex.value === null || !dropPosition.value) {
      clearDragState()
      return null
    }

    const result: DropResult = {
      item: dragItem.value.item,
      sourceList: dragItem.value.sourceList,
      targetList,
      sourceIndex: dragItem.value.sourceIndex,
      targetIndex,
      position: dropPosition.value
    }

    clearDragState()
    return result
  }

  // Transfer data helpers
  function setTransferData(event: DragEvent, item: DragItem) {
    if (!event.dataTransfer) return

    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        field: item.item.field,
        sourceList: item.sourceList,
        sourceIndex: item.sourceIndex,
        item: item.item
      })
    )
  }

  function getTransferData(event: DragEvent): Partial<DragItem> {
    try {
      const data = event.dataTransfer?.getData('application/json')
      return data ? JSON.parse(data) : {}
    } catch {
      return {}
    }
  }

  return {
    // State
    dragItem,
    dragOverIndex,
    dropPosition,
    isDragging,
    canDrop,

    // Methods
    startDrag,
    updateDragOver,
    clearDragState,
    processDrop,
    setTransferData,
    getTransferData
  }
}
