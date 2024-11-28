import type { CategoryDefinition } from '../../types'
import {
  buildCategoryHierarchy,
  validateHierarchy,
  getDescendants,
  getAncestors
} from './relations'

// Update types
export type CategoryUpdateType = 'add' | 'remove' | 'modify' | 'reorder'

export interface CategoryUpdate {
  type: CategoryUpdateType
  category: CategoryDefinition
  previousParent?: string
}

export interface UpdateResult {
  success: boolean
  error?: Error
  affectedCategories: Set<string>
}

// Update options
export interface UpdateOptions {
  validateBeforeUpdate?: boolean
  cascadeUpdates?: boolean
  notifyAffected?: boolean
  onProgress?: (progress: UpdateProgress) => void
}

export interface UpdateProgress {
  processed: number
  total: number
  currentCategory: string
  affectedCategories: Set<string>
}

const defaultOptions: Required<UpdateOptions> = {
  validateBeforeUpdate: true,
  cascadeUpdates: true,
  notifyAffected: true,
  onProgress: () => {}
}

// Mutable category type for internal use
interface MutableCategory {
  id: string
  name: string
  parent?: string
}

// Convert between readonly and mutable categories
function toMutable(category: CategoryDefinition): MutableCategory {
  return {
    id: category.id,
    name: category.name,
    parent: category.parent
  }
}

function toReadonly(category: MutableCategory): CategoryDefinition {
  return {
    id: category.id,
    name: category.name,
    parent: category.parent
  }
}

// Apply category updates
export async function applyCategoryUpdates(
  categories: CategoryDefinition[],
  updates: CategoryUpdate[],
  options: UpdateOptions = {}
): Promise<UpdateResult> {
  const opts = { ...defaultOptions, ...options }
  const affectedCategories = new Set<string>()
  const mutableCategories = categories.map(toMutable)

  try {
    // Validate hierarchy if required
    if (opts.validateBeforeUpdate) {
      const isValid = validateHierarchy(categories)
      if (!isValid) {
        throw new Error('Invalid category hierarchy detected')
      }
    }

    // Process updates
    for (let i = 0; i < updates.length; i++) {
      const update = updates[i]
      await processUpdate(update, mutableCategories, affectedCategories, opts)

      // Report progress
      opts.onProgress({
        processed: i + 1,
        total: updates.length,
        currentCategory: update.category.id,
        affectedCategories: new Set(affectedCategories)
      })

      // Simulate async operation
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    // Validate final state
    if (opts.validateBeforeUpdate) {
      const finalCategories = mutableCategories.map(toReadonly)
      const isValid = validateHierarchy(finalCategories)
      if (!isValid) {
        throw new Error('Invalid category hierarchy after updates')
      }
    }

    return {
      success: true,
      affectedCategories
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
      affectedCategories
    }
  }
}

// Process single update
async function processUpdate(
  update: CategoryUpdate,
  categories: MutableCategory[],
  affectedCategories: Set<string>,
  options: Required<UpdateOptions>
): Promise<void> {
  const { type, category, previousParent } = update
  const mutableCategory = toMutable(category)

  switch (type) {
    case 'add':
      await addCategory(mutableCategory, categories, affectedCategories, options)
      break

    case 'remove':
      await removeCategory(mutableCategory, categories, affectedCategories, options)
      break

    case 'modify':
      await modifyCategory(
        mutableCategory,
        previousParent,
        categories,
        affectedCategories,
        options
      )
      break

    case 'reorder':
      await reorderCategory(mutableCategory, categories, affectedCategories, options)
      break

    default:
      throw new Error(`Unsupported update type: ${type}`)
  }

  // Simulate async operation
  await new Promise((resolve) => setTimeout(resolve, 0))
}

// Add new category
async function addCategory(
  category: MutableCategory,
  categories: MutableCategory[],
  affectedCategories: Set<string>,
  options: Required<UpdateOptions>
): Promise<void> {
  // Check for existing category
  if (categories.some((c) => c.id === category.id)) {
    throw new Error(`Category ${category.id} already exists`)
  }

  // Add category
  categories.push(category)
  affectedCategories.add(category.id)

  // Update affected categories
  if (options.cascadeUpdates && category.parent) {
    affectedCategories.add(category.parent)
    const hierarchy = buildCategoryHierarchy(categories.map(toReadonly))
    const ancestors = getAncestors(category.id, hierarchy)
    ancestors.forEach((id) => affectedCategories.add(id))
  }

  await new Promise((resolve) => setTimeout(resolve, 0))
}

// Remove category
async function removeCategory(
  category: MutableCategory,
  categories: MutableCategory[],
  affectedCategories: Set<string>,
  options: Required<UpdateOptions>
): Promise<void> {
  const index = categories.findIndex((c) => c.id === category.id)
  if (index === -1) {
    throw new Error(`Category ${category.id} not found`)
  }

  // Get affected categories before removal
  if (options.cascadeUpdates) {
    const hierarchy = buildCategoryHierarchy(categories.map(toReadonly))
    const descendants = getDescendants(category.id, hierarchy)
    const ancestors = getAncestors(category.id, hierarchy)
    descendants.forEach((id) => affectedCategories.add(id))
    ancestors.forEach((id) => affectedCategories.add(id))
  }

  // Remove category
  categories.splice(index, 1)
  affectedCategories.add(category.id)

  // Update child categories
  if (options.cascadeUpdates) {
    categories
      .filter((c) => c.parent === category.id)
      .forEach((child) => {
        child.parent = category.parent
        affectedCategories.add(child.id)
      })
  }

  await new Promise((resolve) => setTimeout(resolve, 0))
}

// Modify category
async function modifyCategory(
  category: MutableCategory,
  previousParent: string | undefined,
  categories: MutableCategory[],
  affectedCategories: Set<string>,
  options: Required<UpdateOptions>
): Promise<void> {
  const index = categories.findIndex((c) => c.id === category.id)
  if (index === -1) {
    throw new Error(`Category ${category.id} not found`)
  }

  // Track affected categories
  affectedCategories.add(category.id)
  if (previousParent) affectedCategories.add(previousParent)
  if (category.parent) affectedCategories.add(category.parent)

  // Update category
  categories[index] = category

  // Update affected categories
  if (options.cascadeUpdates) {
    const hierarchy = buildCategoryHierarchy(categories.map(toReadonly))
    const descendants = getDescendants(category.id, hierarchy)
    const ancestors = getAncestors(category.id, hierarchy)
    descendants.forEach((id) => affectedCategories.add(id))
    ancestors.forEach((id) => affectedCategories.add(id))
  }

  await new Promise((resolve) => setTimeout(resolve, 0))
}

// Reorder category
async function reorderCategory(
  category: MutableCategory,
  categories: MutableCategory[],
  affectedCategories: Set<string>,
  options: Required<UpdateOptions>
): Promise<void> {
  const index = categories.findIndex((c) => c.id === category.id)
  if (index === -1) {
    throw new Error(`Category ${category.id} not found`)
  }

  // Track affected categories
  affectedCategories.add(category.id)
  if (category.parent) {
    affectedCategories.add(category.parent)
  }

  // Remove and reinsert at new position
  categories.splice(index, 1)
  categories.push(category)

  // Update affected categories
  if (options.cascadeUpdates) {
    const hierarchy = buildCategoryHierarchy(categories.map(toReadonly))
    const siblings = categories.filter((c) => c.parent === category.parent)
    siblings.forEach((sibling) => affectedCategories.add(sibling.id))
    const descendants = getDescendants(category.id, hierarchy)
    descendants.forEach((id) => affectedCategories.add(id))
  }

  await new Promise((resolve) => setTimeout(resolve, 0))
}
