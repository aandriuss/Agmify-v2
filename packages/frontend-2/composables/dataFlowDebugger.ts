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
    processedData: any[],
    currentTableColumns: any[],
    currentDetailColumns: any[]
  ) {
    const parameterValues = new Map()

    // Analyze parameter values distribution
    processedData.forEach((item) => {
      currentTableColumns.forEach((col) => {
        if (!parameterValues.has(col.field)) {
          parameterValues.set(col.field, new Set())
        }
        parameterValues.get(col.field).add(item[col.field])
      })

      if (item.details) {
        item.details.forEach((detail) => {
          currentDetailColumns.forEach((col) => {
            if (!parameterValues.has(`detail_${col.field}`)) {
              parameterValues.set(`detail_${col.field}`, new Set())
            }
            parameterValues.get(`detail_${col.field}`).add(detail[col.field])
          })
        })
      }
    })

    debugState.value.dataProcessing = {
      processedElements: processedData.length,
      parameterValues: Object.fromEntries(
        Array.from(parameterValues.entries()).map(([key, values]) => [
          key,
          Array.from(values).length
        ])
      ),
      timestamp: new Date().toISOString()
    }

    console.group('🔄 Data Processing Check')
    console.log('Processed Elements:', {
      totalCount: processedData.length,
      parentElements: processedData.filter((d) => !d.details).length,
      elementsWithChildren: processedData.filter((d) => d.details?.length > 0).length
    })
    console.log(
      'Parameter Values Distribution:',
      Object.fromEntries(
        Array.from(parameterValues.entries()).map(([key, values]) => [
          key,
          {
            uniqueValues: Array.from(values).length,
            sampleValues: Array.from(values).slice(0, 3)
          }
        ])
      )
    )
    console.groupEnd()
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
    logDataProcessing
  }
}
