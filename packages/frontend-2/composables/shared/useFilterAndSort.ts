import { computed } from 'vue'
import type { Ref } from 'vue'
import type {
  TableColumn,
  AvailableBimParameter,
  AvailableUserParameter
} from '~/composables/core/types'

import {
  isAvailableBimParameter,
  isAvailableUserParameter
} from '~/composables/core/types'

type AvailableParameter = AvailableBimParameter | AvailableUserParameter

interface UseFilterAndSortOptions {
  items: Ref<(TableColumn | AvailableParameter)[]>
  searchTerm: Ref<string>
  isGrouped: Ref<boolean>
  sortBy: Ref<'name' | 'category' | 'type' | 'fixed'>
}

export function useFilterAndSort({
  items,
  searchTerm,
  isGrouped,
  sortBy
}: UseFilterAndSortOptions) {
  // Helper function to get item name
  function getItemName(item: TableColumn | AvailableParameter): string {
    const param = 'parameter' in item ? item.parameter : item
    const displayName = param.metadata?.displayName
    return typeof displayName === 'string' ? displayName : param.name
  }

  // Helper function to get item group
  function getItemGroup(item: TableColumn | AvailableParameter): string {
    const param = 'parameter' in item ? item.parameter : item

    if (isAvailableBimParameter(param)) {
      return param.group.currentGroup || param.group.fetchedGroup || 'Ungrouped'
    }

    if (isAvailableUserParameter(param)) {
      return param.group.currentGroup || 'User Parameters'
    }

    return 'Ungrouped'
  }

  // Helper function to get item type
  function getItemType(item: TableColumn | AvailableParameter): string {
    return 'parameter' in item ? item.parameter.type : item.type
  }

  // Filter items based on search term
  const filteredItems = computed(() => {
    if (!searchTerm.value) return items.value

    const searchLower = searchTerm.value.toLowerCase()
    return items.value.filter((item) => {
      const name = getItemName(item).toLowerCase()
      const group = getItemGroup(item).toLowerCase()
      const type = getItemType(item).toLowerCase()

      return (
        name.includes(searchLower) ||
        group.includes(searchLower) ||
        type.includes(searchLower)
      )
    })
  })

  // Sort items when not grouped
  const sortedItems = computed(() => {
    if (isGrouped.value) return filteredItems.value

    return [...filteredItems.value].sort((a, b) => {
      switch (sortBy.value) {
        case 'name':
          return getItemName(a).localeCompare(getItemName(b))
        case 'category':
          return getItemGroup(a).localeCompare(getItemGroup(b))
        case 'type':
          return getItemType(a).localeCompare(getItemType(b))
        case 'fixed': {
          const isFixedA = getItemType(a) === 'fixed'
          const isFixedB = getItemType(b) === 'fixed'
          return (isFixedB ? 1 : 0) - (isFixedA ? 1 : 0)
        }
        default:
          return 0
      }
    })
  })

  // Group items
  const groupedItems = computed(() => {
    const groups: Record<
      string,
      { group: string; items: (TableColumn | AvailableParameter)[] }
    > = {}

    filteredItems.value.forEach((item) => {
      const group = getItemGroup(item)
      if (!groups[group]) {
        groups[group] = {
          group,
          items: []
        }
      }
      groups[group].items.push(item)
    })

    // Sort groups by priority and name
    return Object.values(groups)
      .sort((a, b) => {
        // System groups first
        const aIsSystem = a.group.startsWith('__')
        const bIsSystem = b.group.startsWith('__')
        if (aIsSystem && !bIsSystem) return -1
        if (!aIsSystem && bIsSystem) return 1

        // User parameters last
        const aIsUser = a.group === 'User Parameters'
        const bIsUser = b.group === 'User Parameters'
        if (aIsUser && !bIsUser) return 1
        if (!aIsUser && bIsUser) return -1

        // Other parameters last
        const aIsOther = a.group === 'Other Parameters'
        const bIsOther = b.group === 'Other Parameters'
        if (aIsOther && !bIsOther) return 1
        if (!aIsOther && bIsOther) return -1

        // Then sort alphabetically
        return a.group.localeCompare(b.group)
      })
      .map((group) => ({
        ...group,
        items: group.items.sort((a, b) => getItemName(a).localeCompare(getItemName(b)))
      }))
  })

  return {
    filteredItems,
    sortedItems,
    groupedItems
  }
}
