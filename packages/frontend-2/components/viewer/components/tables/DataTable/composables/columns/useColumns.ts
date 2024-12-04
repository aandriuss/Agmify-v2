import { ref, computed, watch } from 'vue'
import type {
  ParameterDefinition,
  ColumnDef,
  UseColumnsOptions
} from '~/composables/core/types'

export function useColumns({
  initialColumns,
  searchTerm = ref(''),
  isGrouped = ref(true),
  sortBy = ref('category' as const),
  selectedCategories = ref<string[]>([])
}: UseColumnsOptions) {
  // Initialize columns ref with proper type
  const columns = ref<(ColumnDef | ParameterDefinition)[]>([])

  // Initialize columns function
  const initializeColumns = (newColumns: any) => {
    // Handle computed ref case
    const columnsValue = typeof newColumns === 'function' ? newColumns() : newColumns

    if (!columnsValue) {
      console.warn('No columns provided')
      columns.value = []
      return
    }

    // Ensure we're working with an array
    const columnsArray = Array.isArray(columnsValue) ? columnsValue : [columnsValue]

    columns.value = columnsArray.map((col, index) => ({
      ...col,
      order: 'order' in col ? col.order : index,
      visible: 'visible' in col ? col.visible : true
    }))

    console.log('Columns initialized:', {
      input: columnsValue,
      processed: columns.value,
      count: columns.value.length
    })
  }

  // Watch initialColumns with immediate effect
  watch(
    () => initialColumns,
    (newValue) => {
      console.log('InitialColumns changed:', {
        value: newValue,
        type: typeof newValue,
        isComputed: typeof newValue === 'function'
      })
      initializeColumns(newValue)
    },
    { immediate: true, deep: true }
  )

  const dragOverIndex = ref(-1)

  console.log('useColumns initialized with:', {
    initialColumns,
    isArray: Array.isArray(initialColumns),
    columnsValue: columns.value
  })

  // Filtered columns with proper category handling
  const filteredColumns = computed(() => {
    console.group('Column Filtering Debug')
    const result = [...columns.value]

    console.log('Initial state:', {
      totalColumns: result.length,
      selectedCategories: selectedCategories.value,
      searchTerm: searchTerm.value
    })

    let filtered = result

    // Apply category filtering if categories are selected
    if (selectedCategories.value?.length) {
      filtered = filtered.filter(
        (col) => col.category && selectedCategories.value.includes(col.category)
      )
      console.log('After category filtering:', {
        remaining: filtered.length,
        categories: [...new Set(filtered.map((p) => p.category))]
      })
    }

    // Apply search term filtering
    if (searchTerm.value) {
      const normalizedSearch = searchTerm.value.toLowerCase().trim()
      filtered = filtered.filter((col) => {
        const searchableFields = [
          col.header,
          col.field,
          col.category,
          'type' in col ? col.type : ''
        ].filter(Boolean)

        return searchableFields.some((field) =>
          field.toLowerCase().includes(normalizedSearch)
        )
      })
      console.log('After search filtering:', {
        remaining: filtered.length
      })
    }

    // Sort the filtered results
    const sorted = filtered.sort((a, b) => {
      switch (sortBy.value) {
        case 'name':
          return (a.header || a.field).localeCompare(b.header || b.field)
        case 'category':
          // Ensure 'Other' category is handled properly
          const catA = a.category || 'Other'
          const catB = b.category || 'Other'
          return catA.localeCompare(catB)
        case 'type': {
          const typeA = 'type' in a ? a.type : 'unknown'
          const typeB = 'type' in b ? b.type : 'unknown'
          return typeA.localeCompare(typeB)
        }
        case 'fixed':
          const aFixed = 'isFixed' in a ? a.isFixed : false
          const bFixed = 'isFixed' in b ? b.isFixed : false
          return aFixed === bFixed
            ? (a.header || a.field).localeCompare(b.header || b.field)
            : aFixed
            ? -1
            : 1
        default:
          return (a.order || 0) - (b.order || 0)
      }
    })

    console.log('Final result:', {
      count: sorted.length,
      categories: [...new Set(sorted.map((col) => col.category || 'Other'))]
    })
    console.groupEnd()

    return sorted
  })

  // Group columns
  const groupedColumns = computed(() => {
    if (!isGrouped.value) return []

    const result = filteredColumns.value.reduce((acc, col) => {
      const category = col.category || 'Other'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(col)
      return acc
    }, {} as Record<string, (ColumnDef | ParameterDefinition)[]>)

    return Object.entries(result)
      .map(([category, columns]) => ({
        category,
        columns: columns.sort((a, b) => (a.order || 0) - (b.order || 0))
      }))
      .sort((a, b) => a.category.localeCompare(b.category))
  })

  const updateColumns = (
    newColumns: (ColumnDef | ParameterDefinition)[] | null | undefined
  ) => {
    // Safely handle non-array or undefined/null values
    if (!newColumns) {
      columns.value = []
      return
    }

    if (!Array.isArray(newColumns)) {
      console.warn('updateColumns received non-array value:', newColumns)
      return
    }

    columns.value = newColumns.map((col, index) => ({
      ...col,
      order: col.order ?? index,
      visible: col.visible ?? true
    }))
  }

  // Watch for initial columns changes
  watch(
    () => initialColumns,
    (newCols) => {
      console.log('Initial columns changed:', {
        newCount: newCols?.length,
        isArray: Array.isArray(newCols)
      })
      if (newCols) {
        initializeColumns(newCols)
      }
    },
    { immediate: true, deep: true }
  )

  return {
    columns,
    dragOverIndex,
    filteredColumns,
    groupedColumns,
    updateColumns,
    updateSelectedCategories: (categories: string[]) => {
      selectedCategories.value = categories
    }
  }
}
