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
