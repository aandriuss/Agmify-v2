import { ref, computed } from 'vue'
import { useRootNodes } from '~/components/viewer/composables/useRootNodes'

export function useElementsData() {
  const wallsMap = ref(new Map())
  const beamsList = ref([])
  const { rootNodes } = useRootNodes()

  const scheduleData = computed(() => {
    console.log('Raw data:', {
      walls: Array.from(wallsMap.value.values()),
      beams: beamsList.value
    })

    const wallsWithBeams = Array.from(wallsMap.value.values()).map((wall) => {
      const wallData = {
        id: wall.id,
        name: wall.name || 'Unnamed Wall',
        mark: wall.mark || 'No Mark',
        category: 'Walls',
        details: beamsList.value
          .filter((beam) => beam.host === wall.mark)
          .map((beam) => ({
            id: beam.id,
            description: beam.type,
            assignee: beam.host || 'No Host'
          }))
      }
      console.log('Processed wall:', wallData)
      return wallData
    })

    console.log('Processed wallsWithBeams:', wallsWithBeams)

    const unattachedBeams = beamsList.value
      .filter(
        (beam) => !beam.host || !Array.from(wallsMap.value.keys()).includes(beam.host)
      )
      .map((beam) => ({
        id: beam.id,
        name: `Beam ${beam.id}`,
        mark: 'No Host',
        category: 'Beams',
        details: []
      }))

    console.log('Unattached beams:', unattachedBeams)

    const unmarkedWalls = Array.from(wallsMap.value.values())
      .filter((wall) => !wall.mark)
      .map((wall) => ({
        id: wall.id,
        name: wall.name || 'Unnamed Wall',
        mark: 'No Mark',
        category: 'Walls',
        details: []
      }))

    console.log('Unmarked walls:', unmarkedWalls)

    const finalData = [...wallsWithBeams, ...unmarkedWalls, ...unattachedBeams]
    console.log('Final data for table:', finalData)

    return finalData
  })

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
            category: node.raw.Other?.Category
          })
        }
      }

      if (node.raw?.type === 'IFCBEAM') {
        beamsList.value.push({
          id: node.raw.id,
          type: node.raw.type,
          host: node.raw.Constraints?.Host
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
    // Get all walls (both with and without marks)
    const allWalls = Array.from(wallsMap.value.values()).map((wall) => ({
      id: wall.id,
      type: 'IFCWALLSTANDARDCASE',
      mark: wall.mark || 'No Mark',
      name: wall.name || '',
      category: 'Walls'
    }))

    // Get all beams (both with and without hosts)
    const allBeams = beamsList.value.map((beam) => ({
      id: beam.id,
      type: 'IFCBEAM',
      host: beam.host || 'No Host'
    }))

    // Create wall-beam hierarchy
    const wallBeamStructure = allWalls.map((wall) => ({
      ...wall,
      details: allBeams.filter((beam) => beam.host === wall.mark)
    }))

    // Add unattached beams to structure
    const unattachedBeams = allBeams.filter(
      (beam) => !beam.host || !allWalls.some((wall) => wall.mark === beam.host)
    )

    if (unattachedBeams.length > 0) {
      wallBeamStructure.push({
        id: 'unattached',
        type: 'Group',
        mark: 'No Host Wall',
        name: 'Unattached Elements',
        category: 'Various',
        details: unattachedBeams
      })
    }

    // Log for debugging
    console.log('Data Processing Results:', {
      allWalls: {
        count: allWalls.length,
        items: allWalls
      },
      allBeams: {
        count: allBeams.length,
        items: allBeams
      },
      wallBeamStructure: {
        count: wallBeamStructure.length,
        items: wallBeamStructure
      }
    })

    return wallBeamStructure
  })

  return {
    // Return processed data ready for table
    scheduleData: processedData,
    // Might still be useful for debugging
    wallsMap,
    beamsList,
    processElements
  }
}
