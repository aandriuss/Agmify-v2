import { ref, watchEffect } from 'vue'

export function useDataFlowDebugger() {
  const debugState = ref({
    categorySelection: {
      parentCategories: [],
      childCategories: [],
      timestamp: null
    },
    headerExtraction: {
      parentHeaders: [],
      childHeaders: [],
      parameterGroups: {},
      timestamp: null
    },
    dataProcessing: {
      processedElements: [],
      parameterValues: {},
      timestamp: null
    }
  })

  function logCategorySelection(parentCategories: string[], childCategories: string[]) {
    debugState.value.categorySelection = {
      parentCategories,
      childCategories,
      timestamp: new Date().toISOString()
    }
    console.group('🎯 Category Selection Check')
    console.log('Parent Categories:', parentCategories)
    console.log('Child Categories:', childCategories)
    console.groupEnd()
  }

  function logWallElements(stage: string, nodes: any[]) {
    console.group(`🧱 Wall Elements - ${stage}`)
    try {
      const wallElements = nodes.filter((node) => {
        const raw = node.rawNode?.raw || node.raw
        if (!raw) return false

        // Check various properties that might indicate a wall
        const isWall =
          raw.type?.toLowerCase().includes('wall') ||
          raw.speckle_type?.toLowerCase().includes('wall') ||
          raw.Other?.Category === 'Walls' ||
          raw['Identity Data']?.Category === 'Walls'

        return isWall
      })

      console.log('Wall Elements Found:', {
        total: wallElements.length,
        breakdown: wallElements.map((node) => {
          const raw = node.rawNode?.raw || node.raw
          return {
            id: raw.id,
            type: raw.type,
            category: raw.Other?.Category || raw['Identity Data']?.Category,
            mark: raw['Identity Data']?.Mark || raw.Name,
            hasIdentityData: !!raw['Identity Data'],
            hasConstraints: !!raw.Constraints,
            constraintsHost: raw.Constraints?.Host
          }
        })
      })

      if (wallElements.length === 0) {
        console.warn('❌ No wall elements found at this stage')
      }
    } finally {
      console.groupEnd()
    }

    return {
      wallCount: wallElements.length,
      timestamp: new Date().toISOString()
    }
  }

  function logHeaderExtraction(
    headers: { parent: any[]; child: any[] },
    rootNodes: any[]
  ) {
    const parameterGroups = new Map()

    // Analyze parameter groups in root nodes
    rootNodes.forEach((node) => {
      if (!node?.rawNode?.raw) return
      Object.keys(node.rawNode.raw).forEach((key) => {
        if (typeof node.rawNode.raw[key] === 'object') {
          parameterGroups.set(
            key,
            parameterGroups.has(key) ? parameterGroups.get(key) + 1 : 1
          )
        }
      })
    })

    debugState.value.headerExtraction = {
      parentHeaders: headers.parent,
      childHeaders: headers.child,
      parameterGroups: Object.fromEntries(parameterGroups),
      timestamp: new Date().toISOString()
    }

    console.group('📋 Header Extraction Check')
    console.log('Parent Headers:', {
      count: headers.parent.length,
      fields: headers.parent.map((h) => h.field),
      groups: [...new Set(headers.parent.map((h) => h.category))]
    })
    console.log('Child Headers:', {
      count: headers.child.length,
      fields: headers.child.map((h) => h.field),
      groups: [...new Set(headers.child.map((h) => h.category))]
    })
    console.log('Parameter Groups Distribution:', Object.fromEntries(parameterGroups))
    console.groupEnd()
  }

  function logDataProcessing(
    stage: string, // Add stage parameter
    processedData: any[],
    currentTableColumns: any[],
    currentDetailColumns: any[]
  ) {
    console.group(`🔄 Data Processing - ${stage}`)

    try {
      // Ensure processedData is an array
      const dataArray = Array.isArray(processedData) ? processedData : []

      const parameterValues = new Map()

      // Safely process data if we have any
      if (dataArray.length > 0) {
        dataArray.forEach((item) => {
          if (!item) return // Skip null/undefined items

          currentTableColumns.forEach((col) => {
            if (!parameterValues.has(col.field)) {
              parameterValues.set(col.field, new Set())
            }
            if (item[col.field] !== undefined) {
              parameterValues.get(col.field).add(item[col.field])
            }
          })

          if (item.details && Array.isArray(item.details)) {
            item.details.forEach((detail) => {
              if (!detail) return // Skip null/undefined details

              currentDetailColumns.forEach((col) => {
                if (!parameterValues.has(`detail_${col.field}`)) {
                  parameterValues.set(`detail_${col.field}`, new Set())
                }
                if (detail[col.field] !== undefined) {
                  parameterValues.get(`detail_${col.field}`).add(detail[col.field])
                }
              })
            })
          }
        })
      }

      debugState.value.dataProcessing = {
        processedElements: dataArray.length,
        parameterValues: Object.fromEntries(
          Array.from(parameterValues.entries()).map(([key, values]) => [
            key,
            Array.from(values).length
          ])
        ),
        timestamp: new Date().toISOString()
      }

      console.log('Processing State:', {
        stage,
        elementCount: dataArray.length,
        hasData: dataArray.length > 0,
        sampleElement: dataArray[0]
          ? {
              category: dataArray[0].category,
              mark: dataArray[0].mark,
              hasDetails: !!dataArray[0].details
            }
          : null
      })

      if (dataArray.length > 0) {
        console.log('Parameter Distribution:', {
          uniqueCategories: [...new Set(dataArray.map((item) => item.category))],
          totalElements: dataArray.length,
          withDetails: dataArray.filter((item) => item.details?.length > 0).length
        })
      } else {
        console.warn('No data to process at this stage')
      }
    } catch (error) {
      console.error('Error in data processing:', error)
    } finally {
      console.groupEnd()
    }
  }

  // Watch for state changes and verify data flow integrity
  watchEffect(() => {
    const state = debugState.value
    if (
      state.categorySelection.timestamp &&
      state.headerExtraction.timestamp &&
      state.dataProcessing.timestamp
    ) {
      console.group('🔍 Data Flow Integrity Check')

      // Verify timestamps follow correct order
      const timestamps = [
        state.categorySelection.timestamp,
        state.headerExtraction.timestamp,
        state.dataProcessing.timestamp
      ].map((t) => new Date(t).getTime())

      console.log(
        'Step Sequence:',
        timestamps.every((t, i) => i === 0 || t >= timestamps[i - 1])
      )

      // Verify category consistency
      const headerCategories = new Set([
        ...state.headerExtraction.parentHeaders.map((h) => h.category),
        ...state.headerExtraction.childHeaders.map((h) => h.category)
      ])

      console.log('Category Coverage:', {
        selectedCategories: [
          ...state.categorySelection.parentCategories,
          ...state.categorySelection.childCategories
        ],
        availableInHeaders: Array.from(headerCategories)
      })

      console.groupEnd()
    }
  })

  return {
    debugState,
    logCategorySelection,
    logHeaderExtraction,
    logDataProcessing,
    logWallElements
  }
}
