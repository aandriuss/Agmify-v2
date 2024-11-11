import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'

interface UseColumnVisibilityOptions {
  updateParameterVisibility: (paramId: string, visible: boolean) => void
}

export function useColumnVisibility(options: UseColumnVisibilityOptions) {
  const { updateParameterVisibility } = options

  const handleColumnVisibilityChange = (column: ColumnDef) => {
    if ('parameterRef' in column && typeof column.parameterRef === 'string') {
      updateParameterVisibility(column.parameterRef, column.visible ?? true)
    }
  }

  return {
    handleColumnVisibilityChange
  }
}
