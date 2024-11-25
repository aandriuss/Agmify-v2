import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import { debug, DebugCategories } from '../debug/useDebug'

/**
 * Merge columns while preserving order and settings.
 * Prioritizes existing column settings while ensuring required columns are present.
 */
export function mergeColumns(
  columns: ColumnDef[],
  defaultCols: ColumnDef[]
): ColumnDef[] {
  const result: ColumnDef[] = []
  const usedFields = new Set<string>()

  // First add essential columns from defaults in their original order
  defaultCols.forEach((defaultCol) => {
    const existingCol = columns.find((col) => col.field === defaultCol.field)
    if (existingCol) {
      result.push({
        ...defaultCol,
        ...existingCol,
        visible: existingCol.visible ?? defaultCol.visible,
        order: existingCol.order ?? defaultCol.order
      })
    } else {
      result.push({ ...defaultCol })
    }
    usedFields.add(defaultCol.field)
  })

  // Then add any remaining columns that weren't in defaults
  columns.forEach((col) => {
    if (!usedFields.has(col.field)) {
      result.push({ ...col })
      usedFields.add(col.field)
    }
  })

  const sortedResult = result.sort((a, b) => (a.order || 0) - (b.order || 0))

  debug.log(DebugCategories.COLUMNS, 'Merged columns', {
    defaultCount: defaultCols.length,
    inputCount: columns.length,
    resultCount: sortedResult.length,
    fields: sortedResult.map((c) => c.field)
  })

  return sortedResult
}

/**
 * Create a column definition with default values.
 */
export function createColumnDef(
  field: string,
  options: Partial<ColumnDef> = {}
): ColumnDef {
  return {
    field,
    header: options.header || field,
    type: options.type || 'parameter',
    visible: options.visible ?? true,
    order: options.order ?? 0,
    source: options.source || 'Parameters',
    category: options.category || 'Parameters',
    fetchedGroup: options.fetchedGroup || 'Parameters',
    currentGroup: options.currentGroup || 'Parameters',
    isFetched: options.isFetched ?? true,
    description: options.description || `Parameter ${field}`,
    isFixed: options.isFixed ?? false,
    isCustomParameter: options.isCustomParameter ?? false,
    expander: options.expander ?? false,
    removable: options.removable,
    width: options.width,
    headerComponent: options.headerComponent,
    parameterRef: options.parameterRef,
    color: options.color
  }
}

/**
 * Create column definitions from parameter names.
 */
export function createColumnsFromParameters(
  parameters: string[],
  defaultCols: ColumnDef[]
): ColumnDef[] {
  return parameters.map((name, index) => {
    const defaultCol = defaultCols.find((col) => col.field === name)
    return createColumnDef(name, {
      ...(defaultCol || {}),
      order: index,
      expander: index === 0
    })
  })
}

/**
 * Ensure all required columns are present with proper settings.
 */
export function ensureRequiredColumns(
  columns: ColumnDef[],
  requiredFields: string[]
): ColumnDef[] {
  const result = [...columns]
  const existingFields = new Set(columns.map((col) => col.field))

  requiredFields.forEach((field, index) => {
    if (!existingFields.has(field)) {
      result.push(createColumnDef(field, { order: columns.length + index }))
    }
  })

  return result
}
