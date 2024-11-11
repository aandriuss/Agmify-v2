// Predefined list of BIM parameters we want to collect
export const BASIC_PARAMETERS = [
  {
    name: 'Mark',
    path: ['Identity Data', 'Mark'] as string[],
    fallback: 'Tag' // If Mark not found, try Tag
  },
  {
    name: 'Category',
    path: ['Other', 'Category'] as string[],
    fallback: 'Uncategorized'
  },
  {
    name: 'Host',
    path: ['Constraints', 'Host'] as string[],
    fallback: ''
  },
  {
    name: 'ID',
    path: ['id'] as string[],
    fallback: ''
  }
]

// Helper to safely get nested property
export function getNestedValue(obj: any, path: string[]): any {
  return path.reduce((acc, key) => (acc ? acc[key] : undefined), obj)
}
