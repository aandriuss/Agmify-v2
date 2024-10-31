import { ref, computed, watch } from 'vue'
import { useRootNodes } from '~/components/viewer/composables/useRootNodes'
import { useDataFlowDebugger } from './dataFlowDebugger'

export function useElementsData({ currentTableColumns, currentDetailColumns }) {
  const { logCategorySelection, logHeaderExtraction, logDataProcessing } =
    useDataFlowDebugger()

  const elementsMap = ref(new Map())
  const childElementsList = ref([])
  const selectedParentCategories = ref<string[]>([])
  const selectedChildCategories = ref<string[]>([])
  const { rootNodes } = useRootNodes()

  // Special handling for common fields
  const specialFieldMappings = {
    category: (node) => {
      if (!node?.raw) return 'Uncategorized'
      return getElementCategory(node)
    },
    mark: (node) => {
      if (!node?.raw) return 'No Mark'

      console.log('Mark extraction for node:', {
        id: node.raw.id,
        hasIdentityData: !!node.raw['Identity Data'],
        name: node.raw.Name,
        type: node.raw.type
      })

      // For walls, prefer Name as mark
      if (getElementCategory(node) === 'Walls' && node.raw.Name) {
        return node.raw.Name
      }

      // Try Identity Data Mark first
      const identityMark = node.raw['Identity Data']?.Mark
      if (identityMark) return identityMark

      // Fallback to Name if available
      if (node.raw.Name) return node.raw.Name

      return 'No Mark'
    },
    id: (node) => {
      if (!node?.raw) return null
      return node.raw.id || node.id
    },
    name: (node) => {
      if (!node?.raw) return null
      return node.raw.Name || node.raw.name || node.name
    },
    host: (node) => {
      if (!node?.raw) return 'No Host'

      // Log the node structure for debugging
      console.log('Host extraction for node:', {
        id: node.raw.id,
        hasConstraints: !!node.raw.Constraints,
        hostValue: node.raw.Constraints?.Host,
        category: getElementCategory(node)
      })

      const hostValue = node.raw.Constraints?.Host
      return hostValue || 'No Host'
    }
  }

  interface ElementData {
    id: string
    category: string
    mark?: string
    host?: string
    comment?: string
    [key: string]: any // For dynamic parameters
  }

  interface UseElementsDataProps {
    currentTableColumns: Ref<any[]>
    currentDetailColumns: Ref<any[]>
  }

  interface PossibleHeaders {
    parent: HeaderInfo[]
    child: HeaderInfo[]
  }

  const updateCategories = (parentCategories: string[], childCategories: string[]) => {
    logCategorySelection(parentCategories, childCategories)
    selectedParentCategories.value = parentCategories
    selectedChildCategories.value = childCategories

    if (rootNodes.value) {
      processElements(rootNodes.value)
    }
  }

  const scheduleData = computed(() => {
    const initialParents = Array.from(elementsMap.value.values())

    // Log initial state
    console.group('📊 Schedule Data Processing')
    console.log('Initial State:', {
      totalParents: initialParents.length,
      parentsByCategory: initialParents.reduce((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + 1
        return acc
      }, {}),
      totalChildren: childElementsList.value.length,
      childrenByCategory: childElementsList.value.reduce((acc, c) => {
        acc[c.category] = (acc[c.category] || 0) + 1
        return acc
      }, {})
    })

    // Process parents with children
    const parentsWithChildren = initialParents.map((parent) => {
      console.group(`Processing Parent: ${parent.mark || parent.id}`)
      console.log('Parent Details:', {
        id: parent.id,
        category: parent.category,
        mark: parent.mark,
        type: parent.type
      })

      const baseElement = {
        ...parent,
        host: 'N/A'
      }

      // Only add details if child categories are selected
      if (selectedChildCategories.value.length > 0) {
        const matchingChildren = childElementsList.value.filter(
          (child) => child.host === parent.mark
        )

        console.log('Children Matching:', {
          parentMark: parent.mark,
          totalMatches: matchingChildren.length,
          matchingChildren: matchingChildren.map((child) => ({
            id: child.id,
            category: child.category,
            host: child.host
          }))
        })

        const result = {
          ...baseElement,
          details: matchingChildren.map((child) => ({
            ...child,
            host: parent.mark
          }))
        }

        console.log('Processed Result:', {
          mark: result.mark,
          category: result.category,
          childrenCount: result.details.length
        })

        console.groupEnd()
        return result
      }

      console.groupEnd()
      return baseElement
    })

    let result = [...parentsWithChildren]

    // Process unattached children
    if (selectedChildCategories.value.length > 0) {
      const unattachedChildren = childElementsList.value.filter(
        (child) =>
          !child.host || !Array.from(elementsMap.value.keys()).includes(child.host)
      )

      console.log('Unattached Children:', {
        count: unattachedChildren.length,
        breakdown: unattachedChildren.reduce((acc, child) => {
          acc[child.category] = (acc[child.category] || 0) + 1
          return acc
        }, {})
      })

      const processedUnattached = unattachedChildren.map((child) => ({
        ...child,
        host: 'No Host',
        details: []
      }))

      result = [...result, ...processedUnattached]
    }

    // Process unmarked parents
    const unmarkedParents = initialParents.filter((parent) => !parent.mark)

    console.log('Unmarked Parents:', {
      count: unmarkedParents.length,
      breakdown: unmarkedParents.reduce((acc, parent) => {
        acc[parent.category] = (acc[parent.category] || 0) + 1
        return acc
      }, {})
    })

    const processedUnmarked = unmarkedParents.map((parent) => ({
      ...parent,
      mark: 'No Mark',
      host: 'N/A',
      details: []
    }))

    const finalResult = [...result, ...processedUnmarked]

    // Log final state
    console.log('Final Result:', {
      totalElements: finalResult.length,
      byCategory: finalResult.reduce((acc, el) => {
        acc[el.category] = (acc[el.category] || 0) + 1
        return acc
      }, {}),
      withChildren: finalResult.filter((el) => el.details?.length > 0).length,
      unmarked: finalResult.filter((el) => el.mark === 'No Mark').length,
      unattached: finalResult.filter((el) => el.host === 'No Host').length
    })

    console.groupEnd()

    return finalResult
  })

  interface HeaderInfo {
    field: string
    header: string
    source: string // To track where the field came from
  }

  function extractPossibleHeaders(rootNodes: any[]): PossibleHeaders {
    const parentHeaders = new Map<string, HeaderInfo>()
    const childHeaders = new Map<string, HeaderInfo>()

    function addHeader(
      headersMap: Map<string, HeaderInfo>,
      field: string,
      source: string
    ) {
      // Don't normalize - keep original field name
      const headerKey = field
      if (!headersMap.has(headerKey)) {
        console.log('Adding header:', { field, source })
        headersMap.set(headerKey, {
          field, // Keep original field name
          header: field, // Keep original field name for display
          source
        })
      }
    }

    function processNode(node: any, headersMap: Map<string, HeaderInfo>) {
      if (!node?.raw) return

      console.log('Raw node data:', JSON.stringify(node.raw, null, 2))

      // Base Properties
      addHeader(headersMap, 'type', 'Base Properties')
      addHeader(headersMap, 'id', 'Base Properties')
      addHeader(headersMap, 'name', 'Base Properties')
      addHeader(headersMap, 'category', 'Base Properties')

      // Process direct properties first
      Object.entries(node.raw).forEach(([key, value]) => {
        if (typeof value !== 'object' || value === null) {
          addHeader(headersMap, key, 'Base Properties')
        }
      })

      // Process Identity Data
      if (node.raw['Identity Data']) {
        Object.entries(node.raw['Identity Data']).forEach(([key, value]) => {
          if (typeof value !== 'object' || value === null) {
            addHeader(headersMap, key, 'Identity Data')
          }
        })
      }

      // Process Constraints
      if (node.raw['Constraints']) {
        Object.entries(node.raw['Constraints']).forEach(([key, value]) => {
          if (typeof value !== 'object' || value === null) {
            addHeader(headersMap, key, 'Constraints')
          }
        })
      }

      // Process Dimensions
      if (node.raw['Dimensions']) {
        Object.entries(node.raw['Dimensions']).forEach(([key, value]) => {
          if (typeof value !== 'object' || value === null) {
            addHeader(headersMap, key, 'Dimensions')
          }
        })
      }

      // Process Material Properties
      if (node.raw['Material Properties']) {
        Object.entries(node.raw['Material Properties']).forEach(([key, value]) => {
          if (typeof value !== 'object' || value === null) {
            addHeader(headersMap, key, 'Material Properties')
          }
        })
      }

      // Process any other object properties
      Object.entries(node.raw).forEach(([groupName, group]) => {
        if (group && typeof group === 'object' && !Array.isArray(group)) {
          if (groupName !== 'children' && groupName !== 'raw') {
            Object.entries(group).forEach(([key, value]) => {
              if (typeof value !== 'object' || value === null) {
                addHeader(headersMap, key, groupName)
              }
            })
          }
        }
      })
    }

    function traverse(node: any) {
      if (!node?.raw) return

      const category = getElementCategory(node)
      console.log('Traversing node:', {
        category,
        isParentCategory: selectedParentCategories.value.includes(category),
        isChildCategory: selectedChildCategories.value.includes(category)
      })

      if (selectedParentCategories.value.includes(category)) {
        processNode(node, parentHeaders)
      }

      if (selectedChildCategories.value.includes(category)) {
        processNode(node, childHeaders)
      }

      // Traverse children
      if (node.children) {
        node.children.forEach((child) => traverse(child))
      }
      if (node.raw?.children) {
        node.raw.children.forEach((child) => traverse(child))
      }
    }

    // Process all nodes
    rootNodes.forEach((node) => traverse(node.rawNode))

    // Convert headers to parameter definitions
    const headers = {
      parent: Array.from(parentHeaders.values()).map(({ field, header, source }) => ({
        field,
        header,
        type: 'string',
        category: source,
        description: `Field from ${source}`
      })),
      child: Array.from(childHeaders.values()).map(({ field, header, source }) => ({
        field,
        header,
        type: 'string',
        category: source,
        description: `Field from ${source}`
      }))
    }

    console.log('Extracted Headers:', {
      parentHeaders: {
        count: headers.parent.length,
        fields: headers.parent.map((h) => h.field),
        categories: [...new Set(headers.parent.map((h) => h.category))]
      },
      childHeaders: {
        count: headers.child.length,
        fields: headers.child.map((h) => h.field),
        categories: [...new Set(headers.child.map((h) => h.category))]
      }
    })

    return headers
  }

  function getElementCategory(node: any): string {
    if (!node?.raw) return 'Uncategorized'

    return (
      node.raw.Other?.Category ||
      node.raw.speckle_type ||
      node.raw.type ||
      'Uncategorized'
    )
  }

  function getNestedValue(obj: any, path: string | string[]): any {
    if (!obj) return null

    const parts = Array.isArray(path) ? path : path.split('.')
    let current = obj

    for (const part of parts) {
      if (current === null || current === undefined) return null
      // Handle array access if the property is an array
      if (Array.isArray(current)) {
        current = current[0] // Take first element if array
      }
      current = current[part]
    }
    return current
  }

  function getParameterValue(node: any, paramDef: any) {
    if (!paramDef?.field || !node?.raw) return null

    // Log the structure we're searching through
    console.log('Searching for parameter:', {
      field: paramDef.field,
      category: paramDef.category,
      nodeStructure: {
        rawKeys: Object.keys(node.raw),
        hasIdentityData: !!node.raw['Identity Data'],
        hasParameters: !!node.raw['Parameters'],
        hasProperties: !!node.raw['Properties']
      }
    })

    // Common property paths to check
    const pathsToCheck = [
      // Direct path on raw
      ['raw', paramDef.field],
      // Category-specific paths
      ['raw', paramDef.category, paramDef.field],
      // Common property groups
      ['raw', 'Identity Data', paramDef.field],
      ['raw', 'Parameters', paramDef.field],
      ['raw', 'Properties', paramDef.field],
      ['raw', 'Constraints', paramDef.field],
      ['raw', 'Dimensions', paramDef.field],
      ['raw', 'Material Properties', paramDef.field],
      ['raw', 'Other', paramDef.field],
      // Try base properties
      [paramDef.field]
    ]

    // Try special field mapping first
    if (paramDef.field in specialFieldMappings) {
      const value = specialFieldMappings[paramDef.field]()
      if (value !== null && value !== undefined) return value
    }

    // Try all paths
    for (const path of pathsToCheck) {
      const value = getNestedValue(node, path)
      if (value !== null && value !== undefined) {
        console.log('Found value at path:', { path, value })
        return value
      }
    }

    // Handle array properties
    if (node.raw[paramDef.field] && Array.isArray(node.raw[paramDef.field])) {
      return node.raw[paramDef.field][0] // Return first element of array
    }

    console.log('Parameter value not found:', {
      field: paramDef.field,
      category: paramDef.category,
      availablePaths: Object.keys(node.raw)
    })

    return null
  }

  function processElements(rootNodes: any[]) {
    // Use existing debugger functions
    logDataProcessing(
      'Start Processing',
      [],
      currentTableColumns.value,
      currentDetailColumns.value
    )

    console.group('🔄 Elements Processing')
    console.log('Initial state:', {
      rootNodesCount: rootNodes.length,
      selectedParentCategories: selectedParentCategories.value,
      selectedChildCategories: selectedChildCategories.value
    })

    // Clear existing data before processing
    elementsMap.value.clear()
    childElementsList.value = []

    // First pass: collect all parent elements and their marks
    const parentMarks = new Set()

    function processParents(node: any) {
      if (!node?.raw) return

      const category = getElementCategory(node)

      console.log('Processing potential parent:', {
        id: node.raw.id,
        category,
        type: node.raw.type,
        isParentCategory: selectedParentCategories.value.includes(category)
      })

      // Process only parent category elements first
      if (selectedParentCategories.value.includes(category)) {
        const parameterValues: Record<string, any> = {}

        // Process columns
        currentTableColumns.value.forEach((column) => {
          if (column.field in specialFieldMappings) {
            parameterValues[column.field] = specialFieldMappings[column.field](node)
          } else {
            const value = getParameterValue(node, {
              field: column.field,
              category: column.category
            })
            parameterValues[column.field] = value
          }
        })

        const elementMark =
          parameterValues.mark || getParameterValue(node, { field: 'mark' })

        if (elementMark) {
          // Store parent element
          const elementData = {
            id: node.raw.id,
            type: node.raw.type,
            mark: elementMark,
            name: node.raw.Name,
            category,
            ...parameterValues
          }
          elementsMap.value.set(elementMark, elementData)
          parentMarks.add(elementMark)

          console.log('Added parent element:', {
            mark: elementMark,
            category,
            id: node.raw.id
          })
        }
      }

      // Traverse children
      if (node.children) {
        node.children.forEach((child: any) => processParents(child))
      }
      if (node.raw?.children) {
        node.raw.children.forEach((child: any) => processParents(child))
      }
    }

    // Process root nodes for parents
    rootNodes.forEach((node) => processParents(node.rawNode))

    console.log('Parent processing complete:', {
      totalParents: elementsMap.value.size,
      parentCategories: [
        ...new Set(Array.from(elementsMap.value.values()).map((p) => p.category))
      ],
      parentMarks: Array.from(parentMarks)
    })

    // After processing parents
    const processedParents = Array.from(elementsMap.value.values())
    logDataProcessing(
      'After Parent Processing',
      processedParents,
      currentTableColumns.value,
      currentDetailColumns.value
    )

    // Second pass: process children
    function processChildren(node: any) {
      if (!node?.raw) return

      const category = getElementCategory(node)

      if (selectedChildCategories.value.includes(category)) {
        const childParamValues: Record<string, any> = {}

        // Get host value
        const hostValue = getNestedValue(node, ['raw', 'Constraints', 'Host'])

        // Process child parameters
        currentDetailColumns.value.forEach((column) => {
          if (column.field in specialFieldMappings) {
            childParamValues[column.field] = specialFieldMappings[column.field](node)
          } else {
            const value = getParameterValue(node, {
              field: column.field,
              category: column.category
            })
            childParamValues[column.field] = value
          }
        })

        // Create child data
        const childData = {
          id: node.raw.id,
          type: node.raw.type,
          mark: getParameterValue(node, { field: 'mark' }),
          name: node.raw.Name,
          host: hostValue && parentMarks.has(hostValue) ? hostValue : 'No Host',
          category,
          ...childParamValues
        }

        console.log('Processing child element:', {
          id: childData.id,
          category: childData.category,
          host: childData.host,
          mark: childData.mark
        })

        childElementsList.value.push(childData)
      }

      // Traverse children
      if (node.children) {
        node.children.forEach((child: any) => processChildren(child))
      }
      if (node.raw?.children) {
        node.raw.children.forEach((child: any) => processChildren(child))
      }
    }

    // Process root nodes for children
    rootNodes.forEach((node) => processChildren(node.rawNode))

    console.log('Processing completion state:', {
      parentElements: {
        total: elementsMap.value.size,
        categories: [
          ...new Set(Array.from(elementsMap.value.values()).map((p) => p.category))
        ]
      },
      childElements: {
        total: childElementsList.value.length,
        categories: [...new Set(childElementsList.value.map((c) => c.category))],
        withValidHosts: childElementsList.value.filter((c) => c.host !== 'No Host')
          .length
      }
    })

    console.groupEnd()

    // Final state logging
    const finalData = [...processedParents, ...childElementsList.value]
    logDataProcessing(
      'Processing Complete',
      finalData,
      currentTableColumns.value,
      currentDetailColumns.value
    )
  }

  // Verify data integrity
  function verifyDataIntegrity(data: any) {
    console.log('Data Integrity Check:', {
      missingValues: currentTableColumns.value.map((col) => ({
        field: col.field,
        missingCount: data.filter((d) => d[col.field] === null).length,
        totalCount: data.length
      })),
      sampleValues: data
        .slice(0, 3)
        .map((item) =>
          Object.fromEntries(
            currentTableColumns.value.map((col) => [col.field, item[col.field]])
          )
        )
    })
  }

  // Available headers for parent and child elements
  const availableHeaders = computed(() => {
    if (!rootNodes.value) return { parent: [], child: [] }
    return extractPossibleHeaders(rootNodes.value)
  })

  // Watch for root nodes changes
  watch(
    () => rootNodes.value,
    (newRootNodes) => {
      if (newRootNodes && selectedParentCategories.value?.length > 0) {
        processElements(newRootNodes)
      }
    },
    { immediate: true }
  )

  watch(
    () => rootNodes.value,
    (newNodes) => {
      if (newNodes) {
        logWallElements('Initial Data', newNodes)
      }
    },
    { immediate: true }
  )

  watch(
    [() => currentTableColumns.value, () => currentDetailColumns.value],
    () => {
      console.warn('Column configuration changed:', {
        parentColumns: currentTableColumns.value?.map((c) => c.field) || [],
        childColumns: currentDetailColumns.value?.map((c) => c.field) || [],
        timestamp: new Date().toISOString()
      })
    },
    { deep: true }
  )

  return {
    scheduleData,
    updateCategories,
    elementsMap,
    childElementsList,
    processElements,
    availableHeaders
  }
}
