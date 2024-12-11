import { debug, DebugCategories } from '../../utils/debug'
import type { ProcessedHeader } from '../../types/viewer/viewer-base'
import type { DiscoveryProgressEvent } from '../../types/parameters/discovery-types'

/**
 * Process items in chunks with progress tracking
 */
export async function processInChunks<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  chunkSize: number = 50,
  onProgress?: (event: DiscoveryProgressEvent) => void
): Promise<R[]> {
  const results: R[] = []
  let processedCount = 0
  const totalItems = items.length

  while (items.length > 0) {
    const chunk = items.splice(0, chunkSize)
    const chunkResults = await Promise.all(chunk.map(processor))
    results.push(...chunkResults)

    processedCount += chunk.length
    onProgress?.({
      processed: processedCount,
      total: totalItems,
      remaining: items.length,
      parameters: results.length
    })

    // Allow other operations to run between chunks
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  return results
}

/**
 * Extract parameters from an object with path tracking
 */
export function extractParametersFromObject(
  obj: Record<string, unknown>,
  basePath: string[] = [],
  category?: string
): ProcessedHeader[] {
  const headers: ProcessedHeader[] = []
  const processedFields = new Set<string>()

  function traverse(current: unknown, path: string[] = []) {
    if (current === null || current === undefined) return

    if (typeof current === 'object') {
      Object.entries(current as Record<string, unknown>).forEach(([key, value]) => {
        const currentPath = [...path, key]
        const fieldId = currentPath.join('.')

        // Skip if already processed
        if (processedFields.has(fieldId)) return

        // Create header
        const header: ProcessedHeader = {
          id: fieldId,
          name: key,
          field: fieldId,
          header: currentPath.join(' > '),
          type:
            typeof value === 'number'
              ? 'number'
              : typeof value === 'boolean'
              ? 'boolean'
              : 'string',
          value,
          visible: true,
          removable: true,
          source: path[0] || 'Parameters',
          category: category || 'Parameters',
          fetchedGroup: path[0] || 'Default',
          currentGroup: path[0] || 'Default',
          isFetched: true
        }

        headers.push(header)
        processedFields.add(fieldId)

        // Recurse if object
        if (typeof value === 'object' && value !== null) {
          traverse(value, currentPath)
        }
      })
    }
  }

  try {
    traverse(obj, basePath)
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to extract parameters:', err)
  }

  return headers
}

/**
 * Extract metadata parameters from an object
 */
export function extractMetadataParameters(
  metadata: Record<string, unknown>,
  category: string = 'Metadata'
): ProcessedHeader[] {
  return Object.entries(metadata).map(([key, value]) => ({
    id: `metadata_${key}`,
    name: key,
    field: `metadata_${key}`,
    header: key,
    type:
      typeof value === 'number'
        ? 'number'
        : typeof value === 'boolean'
        ? 'boolean'
        : 'string',
    value,
    visible: true,
    removable: true,
    source: 'Metadata',
    category,
    fetchedGroup: 'Metadata',
    currentGroup: 'Metadata',
    isFetched: true
  }))
}
