<template>
  <div>
    <ViewerLayoutPanel @close="$emit('close')">
      <template #title>Data Processing</template>
    </ViewerLayoutPanel>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRootNodes } from '~/components/viewer/composables/useRootNodes'
import { useElementsData } from '~/composables/useElementsData'
import { ViewerEvent } from '@speckle/viewer'
import { useViewerEventListener } from '~~/lib/viewer/composables/viewer'

defineEmits(['close'])

const { rootNodes } = useRootNodes()
const { wallsMap, beamsList, processElements } = useElementsData()

// Process and organize data
watch(
  rootNodes,
  (newRootNodes) => {
    if (!newRootNodes) {
      console.error('No rootNodes found.')
      return
    }

    // First, process all elements to get raw data
    processElements(newRootNodes)

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
      beams: allBeams.filter((beam) => beam.host === wall.mark)
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
        beams: unattachedBeams
      })
    }

    // Log the complete data structure
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
        items: wallBeamStructure.map((wall) => ({
          mark: wall.mark,
          name: wall.name,
          beamCount: wall.beams.length,
          beams: wall.beams
        }))
      }
    })

    // Log summary statistics
    console.log('Summary:', {
      totalWalls: allWalls.length,
      wallsWithMarks: allWalls.filter((w) => w.mark !== 'No Mark').length,
      wallsWithoutMarks: allWalls.filter((w) => w.mark === 'No Mark').length,
      totalBeams: allBeams.length,
      beamsWithHosts: allBeams.filter((b) => b.host !== 'No Host').length,
      beamsWithoutHosts: allBeams.filter((b) => b.host === 'No Host').length,
      wallsWithBeams: wallBeamStructure.filter((w) => w.beams.length > 0).length
    })
  },
  { immediate: true }
)

// Handle viewer busy state
useViewerEventListener(ViewerEvent.Busy, (isBusy: boolean) => {
  if (isBusy) return
})
</script>
