import { ref, computed, watch } from 'vue'
import { useRootNodes } from '~/components/viewer/composables/useRootNodes'

export function useElementsData() {
  const wallsMap = ref(new Map())
  const beamsList = ref([])
  const { rootNodes } = useRootNodes()

  function processElements(rootNodes: any[]) {
    function traverse(node: any) {
      if (!node) return

      if (node.raw?.type === 'IFCWALLSTANDARDCASE') {
        const wallMark = node.raw['Identity Data']?.Mark
        if (wallMark) {
          wallsMap.value.set(wallMark, {
            id: node.raw.id,
            type: node.raw.type,
            mark: wallMark,
            name: node.raw.Name,
            // Look for category in Other group, then fall back to speckle_type
            category:
              node.raw.Other?.Category || node.raw.speckle_type || 'Uncategorized'
          })
        }
      }

      if (node.raw?.type === 'IFCBEAM') {
        beamsList.value.push({
          id: node.raw.id,
          type: node.raw.type,
          mark: node.raw['Identity Data']?.Mark,
          name: node.raw.Name,
          host: node.raw.Constraints?.Host,
          // Look for category in Other group, then fall back to speckle_type
          category: node.raw.Other?.Category || node.raw.speckle_type || 'Uncategorized'
        })
      }

      // Debug the raw node data
      if (node.raw?.type === 'IFCBEAM' || node.raw?.type === 'IFCWALLSTANDARDCASE') {
        console.log(`Element type ${node.raw.type}:`, {
          category: node.raw.Other?.Category,
          speckle_type: node.raw.speckle_type,
          raw: node.raw
        })
      }

      // Traverse all possible children
      if (node.children) {
        node.children.forEach((child: any) => traverse(child))
      }
      if (node.raw?.children) {
        node.raw.children.forEach((child: any) => traverse(child))
      }
    }

    // Clear previous data
    wallsMap.value.clear()
    beamsList.value = []

    // Process nodes
    if (rootNodes) {
      rootNodes.forEach((node) => traverse(node.rawNode))
    }
  }

  watch(
    rootNodes,
    (newRootNodes) => {
      if (!newRootNodes) {
        console.error('No rootNodes found.')
        return
      }

      processElements(newRootNodes)
    },
    { immediate: true }
  )

  const processedData = computed(() => {
    const allWalls = Array.from(wallsMap.value.values()).map((wall) => ({
      id: wall.id,
      category: wall.category || 'Uncategorized',
      mark: wall.mark || 'No Mark',
      host: 'N/A',
      comment: wall.name || ''
    }))

    const allBeams = beamsList.value.map((beam) => ({
      id: beam.id,
      category: beam.category || 'Uncategorized',
      mark: beam.mark || 'No Mark',
      host: beam.host || 'No Host',
      comment: beam.name || ''
    }))

    const wallBeamStructure = allWalls.map((wall) => ({
      ...wall,
      details: allBeams.filter((beam) => beam.host === wall.mark)
    }))

    const unattachedBeams = allBeams.filter(
      (beam) => !beam.host || !allWalls.some((wall) => wall.mark === beam.host)
    )

    if (unattachedBeams.length > 0) {
      wallBeamStructure.push({
        id: 'unattached',
        category: 'Various',
        mark: 'No Host',
        host: 'N/A',
        comment: 'Unattached Elements',
        details: unattachedBeams
      })
    }

    return wallBeamStructure
  })

  return {
    scheduleData: processedData,
    wallsMap,
    beamsList,
    processElements
  }
}
