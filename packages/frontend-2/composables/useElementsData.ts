import { ref, computed, watch } from 'vue'
import { useRootNodes } from '~/components/viewer/composables/useRootNodes'

export function useElementsData() {
  const elementsMap = ref(new Map())
  const childElementsList = ref([])
  const selectedParentCategories = ref<string[]>([])
  const selectedChildCategories = ref<string[]>([])
  const { rootNodes } = useRootNodes()

  function getElementCategory(node: any): string {
    return (
      node.raw.Other?.Category ||
      node.raw.speckle_type ||
      node.raw.type ||
      'Uncategorized'
    )
  }

  function processElements(rootNodes: any[]) {
    function traverse(node: any) {
      if (!node?.raw) return

      const category = getElementCategory(node)

      // Process parent elements
      if (selectedParentCategories.value.includes(category)) {
        const elementMark = node.raw['Identity Data']?.Mark
        if (elementMark) {
          elementsMap.value.set(elementMark, {
            id: node.raw.id,
            type: node.raw.type,
            mark: elementMark,
            name: node.raw.Name,
            category
          })
        }
      }

      // Process child elements only if child categories are selected
      if (
        selectedChildCategories.value.length > 0 &&
        selectedChildCategories.value.includes(category)
      ) {
        childElementsList.value.push({
          id: node.raw.id,
          type: node.raw.type,
          mark: node.raw['Identity Data']?.Mark,
          name: node.raw.Name,
          host: node.raw.Constraints?.Host,
          category
        })
      }

      // Traverse children
      if (node.children) {
        node.children.forEach((child: any) => traverse(child))
      }
      if (node.raw?.children) {
        node.raw.children.forEach((child: any) => traverse(child))
      }
    }

    // Clear existing data
    elementsMap.value.clear()
    childElementsList.value = []

    // Process nodes if parent categories are selected
    if (rootNodes && selectedParentCategories.value.length > 0) {
      rootNodes.forEach((node) => traverse(node.rawNode))
    }
  }

  const updateCategories = (parentCategories: string[], childCategories: string[]) => {
    selectedParentCategories.value = parentCategories
    selectedChildCategories.value = childCategories

    if (rootNodes.value) {
      processElements(rootNodes.value)
    }
  }

  const scheduleData = computed(() => {
    const parentsWithChildren = Array.from(elementsMap.value.values()).map((parent) => {
      const baseElement = {
        id: parent.id,
        category: parent.category,
        mark: parent.mark || 'No Mark',
        host: 'N/A',
        comment: parent.name || ''
      }

      // Only add details if child categories are selected
      if (selectedChildCategories.value.length > 0) {
        return {
          ...baseElement,
          details: childElementsList.value
            .filter((child) => child.host === parent.mark)
            .map((child) => ({
              id: child.id,
              category: child.category,
              mark: child.mark || 'No Mark',
              host: parent.mark,
              comment: child.name || ''
            }))
        }
      }

      return baseElement
    })

    let result = [...parentsWithChildren]

    // Only process unattached children if child categories are selected
    if (selectedChildCategories.value.length > 0) {
      const unattachedChildren = childElementsList.value
        .filter(
          (child) =>
            !child.host || !Array.from(elementsMap.value.keys()).includes(child.host)
        )
        .map((child) => ({
          id: child.id,
          category: child.category,
          mark: child.mark || 'No Mark',
          host: 'No Host',
          comment: child.name || '',
          details: []
        }))

      result = [...result, ...unattachedChildren]
    }

    const unmarkedParents = Array.from(elementsMap.value.values())
      .filter((parent) => !parent.mark)
      .map((parent) => ({
        id: parent.id,
        category: parent.category,
        mark: 'No Mark',
        host: 'N/A',
        comment: parent.name || '',
        details: []
      }))

    return [...result, ...unmarkedParents]
  })

  // Watch for root nodes changes
  watch(
    rootNodes,
    (newRootNodes) => {
      if (newRootNodes && selectedParentCategories.value.length > 0) {
        processElements(newRootNodes)
      }
    },
    { immediate: true }
  )

  return {
    scheduleData,
    updateCategories,
    elementsMap,
    childElementsList,
    processElements
  }
}
