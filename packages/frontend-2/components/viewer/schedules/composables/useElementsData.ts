import { ref, computed, watch, defineComponent, h, d } from 'vue'
import { useDataOrganization } from '~/components/viewer/components/tables/DataTable/composables/dataOrganization/useDataOrganization'
import ParameterHeader from '../ParameterHeader.vue'

import { useDataFlowDebugger } from '../../../../composables/dataFlowDebugger'

export function useElementsData({ currentTableColumns, currentDetailColumns }) {
  const { logCategorySelection, logHeaderExtraction, logDataProcessing } =
    useDataFlowDebugger()

  const elementsMap = ref(new Map())
  const childElementsList = ref([])
  const selectedParentCategories = ref<string[]>([])
  const selectedChildCategories = ref<string[]>([])
  const { rootNodes } = useDataOrganization()

  // Helper functions need to be defined before they're used
  function getElementCategory(node: any): string {
    if (!node?.raw) return 'Uncategorized'
    return (
      node.raw.Other?.Category ||
      node.raw.speckle_type ||
      node.raw.type ||
      'Uncategorized'
    )
  }

  // Define the special field mappings
  const specialFieldMappings = {
    category: (node) => {
      if (!node?.raw) return 'Uncategorized'
      return getElementCategory(node)
    },
    mark: (node) => {
      if (!node?.raw) return 'No Mark'

      const category = getElementCategory(node)

      // Log all potential mark sources for debugging
      // console.log('Checking mark sources:', {
      //   id: node.raw.id,
      //   category,
      //   identityDataMark: node.raw['Identity Data']?.Mark,
      //   rawMark: node.raw.Mark,
      //   rawName: node.raw.Name
      // })

      const identityMark = node.raw['Identity Data']?.Mark
      const directMark = node.raw.Mark || node.raw.mark

      if (identityMark) {
        // console.log('Using Identity Data Mark:', identityMark)
        return identityMark
      }

      if (directMark) {
        // console.log('Using direct Mark property:', directMark)
        return directMark
      }

      if (category === 'Walls' && node.raw.Name) {
        // console.log('Using Wall Name as mark:', node.raw.Name)
        return node.raw.Name
      }

      // Fallback to generated mark
      const generatedMark = `${category}-${node.raw.id.substring(0, 8)}`
      // console.log('Using generated mark:', generatedMark)
      return generatedMark
    },

    // Add specific mappings for length and height
    length: (node) => {
      if (!node?.raw) return null
      return node.raw.length || node.raw.Length || node.raw.Dimensions?.length
    },

    height: (node) => {
      if (!node?.raw) return null
      return node.raw.height || node.raw.Height || node.raw.Dimensions?.height
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
      const hostValue = node.raw.Constraints?.Host
      return hostValue || 'No Host'
    }
  }

  function getMarkValue(node: any): string {
    // Try Identity Data Mark first
    const identityDataMark = node.raw['Identity Data']?.Mark
    if (identityDataMark) {
      return identityDataMark.trim()
    }

    // Try direct Mark property
    const directMark = node.raw.Mark || node.raw.mark
    if (directMark) {
      return directMark.trim()
    }

    // For walls, use Name if no mark is found
    const category = getElementCategory(node)
    if (category === 'Walls' && node.raw.Name) {
      return node.raw.Name.trim()
    }

    // Fallback to generated mark
    return `${category}-${node.raw.id.substring(0, 8)}`
  }

  function getNestedValue(obj: any, path: string | string[]): any {
    if (!obj) return null

    const parts = Array.isArray(path) ? path : path.split('.')
    let current = obj

    for (const part of parts) {
      if (current === null || current === undefined) return null
      if (Array.isArray(current)) {
        current = current[0]
      }
      current = current[part]
    }
    return current
  }

  function getParameterValue(node: any, paramDef: any) {
    if (!paramDef?.field || !node?.raw) return null

    // Try special field mapping first
    if (paramDef.field in specialFieldMappings) {
      return specialFieldMappings[paramDef.field](node)
    }

    // Common property paths to check
    const pathsToCheck = [
      ['raw', paramDef.field],
      ['raw', paramDef.category, paramDef.field],
      ['raw', 'Identity Data', paramDef.field],
      ['raw', 'Parameters', paramDef.field],
      ['raw', 'Properties', paramDef.field],
      ['raw', 'Constraints', paramDef.field],
      ['raw', 'Dimensions', paramDef.field],
      ['raw', 'Material Properties', paramDef.field],
      ['raw', 'Other', paramDef.field],
      [paramDef.field]
    ]

    // Try all paths
    for (const path of pathsToCheck) {
      const value = getNestedValue(node, path)
      if (value !== null && value !== undefined) {
        return value
      }
    }

    // Handle array properties
    if (node.raw[paramDef.field] && Array.isArray(node.raw[paramDef.field])) {
      return node.raw[paramDef.field][0]
    }

    return null
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

  function processElements(rootNodes: any[]) {
    // console.group('🔄 Elements Processing')

    // Clear existing data
    elementsMap.value.clear()
    childElementsList.value = []
    const parentMarks = new Set()

    // First pass: Process parent elements (Walls)
    function processParents(node: any) {
      if (!node?.raw) return

      const category = getElementCategory(node)

      if (selectedParentCategories.value.includes(category)) {
        // Get mark first since it's critical for parent identification
        const elementMark = getMarkValue(node)

        // console.log('Parent element mark resolution:', {
        //   id: node.raw.id,
        //   category,
        //   resolvedMark: elementMark,
        //   sources: {
        //     identityData: node.raw['Identity Data']?.Mark,
        //     directMark: node.raw.Mark,
        //     name: node.raw.Name
        //   }
        // })

        if (elementMark) {
          const parameterValues = {}
          currentTableColumns.value.forEach((column) => {
            if (column.field === 'mark') {
              parameterValues[column.field] = elementMark
            } else if (column.field in specialFieldMappings) {
              parameterValues[column.field] = specialFieldMappings[column.field](node)
            } else {
              parameterValues[column.field] = getParameterValue(node, {
                field: column.field,
                category: column.category
              })
            }
          })

          const elementData = {
            id: node.raw.id,
            type: node.raw.type,
            mark: elementMark,
            name: node.raw.Name,
            category,
            ...parameterValues
          }

          // Store with normalized mark for consistent lookup
          const normalizedMark = elementMark.trim()
          elementsMap.value.set(normalizedMark, elementData)
          parentMarks.add(normalizedMark)

          // console.log('Added parent element:', {
          //   id: elementData.id,
          //   mark: normalizedMark,
          //   category,
          //   hasIdentityMark: !!node.raw['Identity Data']?.Mark
          // })
        }
      }

      // Traverse children
      if (node.children) {
        node.children.forEach((child) => processParents(child))
      }
      if (node.raw?.children) {
        node.raw.children.forEach((child) => processParents(child))
      }
    }

    // Second pass: Process child elements
    function processChildren(node: any) {
      if (!node?.raw) return

      const category = getElementCategory(node)

      if (selectedChildCategories.value.includes(category)) {
        const parameterValues = {}
        currentDetailColumns.value.forEach((column) => {
          if (column.field in specialFieldMappings) {
            parameterValues[column.field] = specialFieldMappings[column.field](node)
          } else {
            parameterValues[column.field] = getParameterValue(node, {
              field: column.field,
              category: column.category
            })
          }
        })

        // Get host value
        const hostValue = node.raw.Constraints?.Host?.trim() || 'No Host'

        const childData = {
          id: node.raw.id,
          type: node.raw.type,
          mark: node.raw.Name || `${category}_${node.raw.id.substring(0, 6)}`,
          name: node.raw.Name,
          category,
          host: hostValue,
          ...parameterValues
        }

        // console.log('Processing child:', {
        //   id: childData.id,
        //   category: childData.category,
        //   host: hostValue,
        //   hasParent: elementsMap.value.has(hostValue)
        // })

        childElementsList.value.push(childData)
      }

      // Traverse children
      if (node.children) {
        node.children.forEach((child) => processChildren(child))
      }
      if (node.raw?.children) {
        node.raw.children.forEach((child) => processChildren(child))
      }
    }

    // Process all nodes
    rootNodes.forEach((node) => processParents(node.rawNode))
    rootNodes.forEach((node) => processChildren(node.rawNode))

    // Prepare final data structure
    const parents = Array.from(elementsMap.value.values())
    const result = []

    // Add parents with their children
    parents.forEach((parent) => {
      const children = childElementsList.value.filter(
        (child) => child.host === parent.mark
      )
      result.push({
        ...parent,
        details: children
      })
    })

    // Add ungrouped elements section if there are any orphaned children
    const ungroupedChildren = childElementsList.value.filter(
      (child) => !elementsMap.value.has(child.host)
    )

    if (ungroupedChildren.length > 0) {
      result.push({
        id: 'ungrouped',
        mark: 'Ungrouped',
        name: 'Ungrouped Elements',
        category: 'Ungrouped',
        type: 'group',
        details: ungroupedChildren
      })
    }

    console.log('Final processed data:', {
      totalParents: parents.length,
      totalChildren: childElementsList.value.length,
      ungroupedCount: ungroupedChildren.length,
      byCategory: result.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1
        return acc
      }, {})
    })

    return result
  }

  const scheduleData = computed(() => {
    if (!rootNodes.value || !selectedParentCategories.value.length) return []

    const processedData = processElements(rootNodes.value)

    console.log('Schedule data computed:', {
      totalRows: processedData.length,
      withChildren: processedData.filter((row) => row.details?.length > 0).length,
      hasUngrouped: processedData.some((row) => row.mark === 'Ungrouped')
    })

    return processedData
  })

  interface HeaderInfo {
    field: string
    header: string
    source: string // To track where the field came from
  }

  function extractPossibleHeaders(rootNodes: any[]): PossibleHeaders {
    const parentHeaders = new Map<string, HeaderInfo>()
    const childHeaders = new Map<string, HeaderInfo>()

    // Define addHeader function first
    function addHeader(
      headersMap: Map<string, HeaderInfo>,
      field: string,
      source: string
    ) {
      const headerKey = field
      if (!headersMap.has(headerKey)) {
        // console.log('Adding header:', { field, source })
        headersMap.set(headerKey, {
          field,
          header: field,
          source
        })
      }
    }

    // Process node function stays the same
    function processNode(node: any, headersMap: Map<string, HeaderInfo>) {
      if (!node?.raw) return

      // console.log('Raw node data:', JSON.stringify(node.raw, null, 2))

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

    // Traverse function remains the same
    function traverse(node: any) {
      if (!node?.raw) return

      const category = getElementCategory(node)
      // console.log('Traversing node:', {
      //   category,
      //   isParentCategory: selectedParentCategories.value.includes(category),
      //   isChildCategory: selectedChildCategories.value.includes(category)
      // })

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

    // Process headers after all nodes have been traversed
    const processedHeaders = (headers: Map<string, HeaderInfo>) =>
      Array.from(headers.values()).map((header) => ({
        ...header,
        type: 'string',
        category: header.source,
        description: `Field from ${header.source}`,
        headerComponent: defineComponent({
          setup() {
            return () => h(ParameterHeader, { parameter: header })
          }
        })
      }))

    // Return processed headers
    const result = {
      parent: processedHeaders(parentHeaders),
      child: processedHeaders(childHeaders)
    }

    // console.log('Extracted Headers:', {
    //   parentHeaders: {
    //     count: result.parent.length,
    //     fields: result.parent.map((h) => h.field),
    //     categories: [...new Set(result.parent.map((h) => h.category))]
    //   },
    //   childHeaders: {
    //     count: result.child.length,
    //     fields: result.child.map((h) => h.field),
    //     categories: [...new Set(result.child.map((h) => h.category))]
    //   }
    // })

    return result
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
    // console.log('Searching for parameter:', {
    //   field: paramDef.field,
    //   category: paramDef.category,
    //   nodeStructure: {
    //     rawKeys: Object.keys(node.raw),
    //     hasIdentityData: !!node.raw['Identity Data'],
    //     hasParameters: !!node.raw['Parameters'],
    //     hasProperties: !!node.raw['Properties']
    //   }
    // })

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
        // console.log('Found value at path:', { path, value })
        return value
      }
    }

    // Handle array properties
    if (node.raw[paramDef.field] && Array.isArray(node.raw[paramDef.field])) {
      return node.raw[paramDef.field][0] // Return first element of array
    }

    // console.log('Parameter value not found:', {
    //   field: paramDef.field,
    //   category: paramDef.category,
    //   availablePaths: Object.keys(node.raw)
    // })

    return null
  }

  // Verify data integrity
  // function verifyDataIntegrity(data: any) {
  //   console.log('Data Integrity Check:', {
  //     missingValues: currentTableColumns.value.map((col) => ({
  //       field: col.field,
  //       missingCount: data.filter((d) => d[col.field] === null).length,
  //       totalCount: data.length
  //     })),
  //     sampleValues: data
  //       .slice(0, 3)
  //       .map((item) =>
  //         Object.fromEntries(
  //           currentTableColumns.value.map((col) => [col.field, item[col.field]])
  //         )
  //       )
  //   })
  // }

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

  // watch(
  //   () => rootNodes.value,
  //   (newNodes) => {
  //     if (newNodes) {
  //       logWallElements('Initial Data', newNodes)
  //     }
  //   },
  //   { immediate: true }
  // )

  watch(
    [() => currentTableColumns.value, () => currentDetailColumns.value],
    () => {
      // console.warn('Column configuration changed:', {
      //   parentColumns: currentTableColumns.value?.map((c) => c.field) || [],
      //   childColumns: currentDetailColumns.value?.map((c) => c.field) || [],
      //   timestamp: new Date().toISOString()
      // })
    },
    { deep: true }
  )

  watch(
    () => availableHeaders.value,
    (headers) => {
      // console.group('🔍 Available Headers Debug')
      // console.log('Parent Headers:', {
      //   count: headers.parent.length,
      //   fields: headers.parent.map((h) => h.field),
      //   categories: [...new Set(headers.parent.map((h) => h.category))]
      // })
      // console.log('Child Headers:', {
      //   count: headers.child.length,
      //   fields: headers.child.map((h) => h.field),
      //   categories: [...new Set(headers.child.map((h) => h.category))]
      // })
      // console.groupEnd()
    },
    { immediate: true }
  )

  return {
    scheduleData,
    updateCategories,
    elementsMap,
    childElementsList,
    processElements,
    availableHeaders: computed(() => {
      if (!rootNodes.value) return { parent: [], child: [] }
      return extractPossibleHeaders(rootNodes.value)
    })
  }
}
