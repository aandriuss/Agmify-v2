import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type { ColumnDef, ParameterDefinition } from '../types'

interface DragItem {
  type: 'column' | 'parameter'
  data: ColumnDef | ParameterDefinition
  sourceIndex: number
  sourceList: 'active' | 'available'
  sourceCategory?: string
}

interface UseColumnDragDropOptions {
  activeColumns: Ref<ColumnDef[]>
  availableParameters: Ref<ParameterDefinition[]>
  onAddColumn?: (param: ParameterDefinition) => void
  onRemoveColumn?: (column: ColumnDef) => void
  onReorderColumns?: (fromIndex: number, toIndex: number) => void
}

export function useColumnDragDrop({
  activeColumns,
  availableParameters,
  onAddColumn,
  onRemoveColumn,
  onReorderColumns
}: UseColumnDragDropOptions) {
  const draggedItem = ref<DragItem | null>(null)
  const dragOverIndex = ref<number>(-1)
  const dragOverCategory = ref<string | null>(null)

  const handleDragStart = (
    event: DragEvent,
    item: ColumnDef | ParameterDefinition,
    sourceIndex: number,
    sourceList: 'active' | 'available',
    category?: string
  ) => {
    if (!event.dataTransfer) return

    const dragData: DragItem = {
      type: 'field' in item ? 'parameter' : 'column',
      data: item,
      sourceIndex,
      sourceList,
      sourceCategory: category
    }

    // Set drag data
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/json', JSON.stringify(dragData))
    draggedItem.value = dragData

    // Add custom drag image or styling if needed
    const dragElement = event.target as HTMLElement
    if (dragElement) {
      dragElement.classList.add('dragging')
    }
  }

  const handleDragOver = (event: DragEvent, index: number, category?: string) => {
    event.preventDefault()
    dragOverIndex.value = index
    dragOverCategory.value = category || null
  }

  const handleDragEnter = (event: DragEvent, index: number, category?: string) => {
    event.preventDefault()
    dragOverIndex.value = index
    dragOverCategory.value = category || null
  }

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault()
    if (
      event.target instanceof HTMLElement &&
      !event.currentTarget?.contains(event.relatedTarget as Node)
    ) {
      dragOverIndex.value = -1
      dragOverCategory.value = null
    }
  }

  const handleDrop = async (
    event: DragEvent,
    targetIndex: number,
    category?: string
  ) => {
    event.preventDefault()

    // Clear drag state
    const dragElement = event.target as HTMLElement
    if (dragElement) {
      dragElement.classList.remove('dragging')
    }

    const jsonData = event.dataTransfer?.getData('application/json')
    if (!jsonData || !draggedItem.value) return

    const dragData: DragItem = JSON.parse(jsonData)

    // Handle different drag scenarios
    if (dragData.sourceList === 'available' && dragOverCategory === null) {
      // Dragging from available to active
      const parameter = dragData.data as ParameterDefinition
      onAddColumn?.(parameter)
    } else if (dragData.sourceList === 'active' && dragOverCategory !== null) {
      // Dragging from active to available
      const column = dragData.data as ColumnDef
      onRemoveColumn?.(column)
    } else if (dragData.sourceList === 'active' && dragOverCategory === null) {
      // Reordering within active list
      if (dragData.sourceIndex !== targetIndex) {
        onReorderColumns?.(dragData.sourceIndex, targetIndex)
      }
    }

    // Reset state
    draggedItem.value = null
    dragOverIndex.value = -1
    dragOverCategory.value = null
  }

  const isDraggingOver = computed(() => dragOverIndex.value !== -1)

  const getDragIndicatorStyle = (index: number) => {
    if (dragOverIndex.value !== index) return {}

    return {
      borderTop: '2px solid var(--primary-color)',
      marginTop: '-1px'
    }
  }

  return {
    draggedItem,
    dragOverIndex,
    dragOverCategory,
    isDraggingOver,
    handleDragStart,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    getDragIndicatorStyle
  }
}
