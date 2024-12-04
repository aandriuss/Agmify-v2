import { gql } from 'graphql-tag'

// Simple GraphQL queries for JSON tables
export const GET_TABLES = gql`
  query GetUserTables {
    activeUser {
      tables
    }
  }
`

export const UPDATE_TABLES = gql`
  mutation UpdateUserTables($tables: JSONObject!) {
    userTablesUpdate(tables: $tables)
  }
`

// Default table configuration that will be used when no table is loaded
export const defaultTable = {
  id: 'default',
  name: 'Default Table',
  displayName: 'Default Table',
  parentColumns: [
    {
      id: 'mark',
      name: 'Mark',
      field: 'mark',
      header: 'Mark',
      type: 'string',
      order: 0,
      visible: true,
      removable: false,
      isFixed: true,
      description: 'Element mark identifier',
      source: 'Parameters',
      isFetched: true,
      isCustomParameter: false,
      fetchedGroup: 'Parameters',
      currentGroup: 'Parameters'
    },
    {
      id: 'category',
      name: 'Category',
      field: 'category',
      header: 'Category',
      type: 'string',
      order: 1,
      visible: true,
      removable: true,
      isFixed: false,
      description: 'Element category',
      source: 'Parameters',
      isFetched: true,
      isCustomParameter: false,
      fetchedGroup: 'Parameters',
      currentGroup: 'Parameters'
    }
  ],
  childColumns: [
    {
      id: 'mark',
      name: 'Mark',
      field: 'mark',
      header: 'Mark',
      type: 'string',
      order: 0,
      visible: true,
      removable: false,
      isFixed: true,
      description: 'Element mark identifier',
      source: 'Parameters',
      isFetched: true,
      isCustomParameter: false,
      fetchedGroup: 'Parameters',
      currentGroup: 'Parameters'
    },
    {
      id: 'category',
      name: 'Category',
      field: 'category',
      header: 'Category',
      type: 'string',
      order: 1,
      visible: true,
      removable: true,
      isFixed: false,
      description: 'Element category',
      source: 'Parameters',
      isFetched: true,
      isCustomParameter: false,
      fetchedGroup: 'Parameters',
      currentGroup: 'Parameters'
    }
  ],
  categoryFilters: {
    selectedParentCategories: ['Walls', 'Uncategorized'],
    selectedChildCategories: ['Structural Framing']
  }
}
