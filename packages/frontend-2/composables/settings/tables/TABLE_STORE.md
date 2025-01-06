# Table Store Documentation

## Overview

The Table Store manages all table-specific configurations and their persistence through GraphQL. It handles the complete state of each table including columns, parameters, sorting, filtering, and category configurations.

## Store Structure

### State

```typescript
interface TableState {
  tables: {
    [id: string]: {
      // Table Identity
      id: string
      name: string
      displayName: string

      // Column Configuration
      columns: {
        parentColumns: TableColumn[]
        childColumns: TableColumn[]
      }

      // Parameter Selection
      selectedParameters: {
        id: string
        isParent: boolean
      }[]

      // Sorting
      sort: {
        field?: string
        order?: 'asc' | 'desc'
      }

      // Filtering
      filters: {
        [columnId: string]: {
          value: any
          operator: string
        }
      }

      // Categories
      categoryFilters: {
        selectedParentCategories: string[]
        selectedChildCategories: string[]
      }
    }
  }

  // View State
  currentTableId: string | null
  currentView: 'parent' | 'child'
  isDirty: boolean
  isUpdating: boolean
  lastUpdateTime: number

  // Loading State
  loading: boolean
  error: Error | null
  lastUpdated: number
}
```

### GraphQL Schema

```graphql
type Table {
  id: ID!
  name: String!
  displayName: String!
  columns: TableColumns!
  selectedParameters: [SelectedParameter!]!
  sort: TableSort
  filters: [TableFilter!]
  categoryFilters: CategoryFilters!
}

type TableColumns {
  parentColumns: [TableColumn!]!
  childColumns: [TableColumn!]!
}

type TableColumn {
  id: ID!
  field: String!
  header: String!
  width: Int
  visible: Boolean!
  order: Int!
}

type SelectedParameter {
  id: ID!
  name: String!
  kind: String!
  type: String!
  value: JSON
  group: String!
  visible: Boolean!
  category: String
  description: String
}

type TableSort {
  field: String
  order: SortOrder
}

type TableFilter {
  columnId: ID!
  value: JSON
  operator: String!
}

type CategoryFilters {
  selectedParentCategories: [String!]!
  selectedChildCategories: [String!]!
}

enum SortOrder {
  ASC
  DESC
}
```

## Core Operations

### Table Management

- `loadTable(tableId: string)`: Load table from PostgreSQL
- `saveTable(settings: TableSettings)`: Save table to PostgreSQL
- `updateTable(updates: Partial<TableSettings>)`: Update current table
- `deleteTable(tableId: string)`: Delete table from PostgreSQL
- `initTable(config: TableConfig)`: Initialize new table with defaults

### View Management

- `toggleView()`: Toggle between parent and child views
- `setCurrentTable(tableId: string | null)`: Set current table and persist selection

### Column Management

- `addParentColumn(column: TableColumn)`: Add new parent column
- `addChildColumn(column: TableColumn)`: Add new child column
- `removeParentColumn(columnId: string)`: Remove parent column
- `removeChildColumn(columnId: string)`: Remove child column
- `updateColumnVisibility(view: 'parent' | 'child', columnId: string, visible: boolean)`: Update column visibility
- `reorderColumns(view: 'parent' | 'child', columnIds: string[])`: Reorder columns
- `resizeColumn(view: 'parent' | 'child', columnId: string, width: number)`: Update column width
- `updateColumns(parentColumns: TableColumn[], childColumns: TableColumn[])`: Bulk update columns

### Parameter Management

- `selectParameter(parameterId: string)`: Select parameter
- `deselectParameter(parameterId: string)`: Deselect parameter
- `updateSelectedParameters(parameters: SelectedParameter[])`: Bulk update parameters

### Sorting & Filtering

- `setSortField(field: string)`: Set sort field
- `setSortOrder(order: SortOrder)`: Set sort order
- `clearSort()`: Clear sorting
- `setFilter(columnId: string, filter: TableFilter)`: Set column filter
- `clearFilter(columnId: string)`: Clear column filter
- `clearAllFilters()`: Clear all filters
- `updateCategoryFilters(filters: CategoryFilters)`: Update category filters

## Data Flow

### Loading Tables

1. Fetch tables via GraphQL query
2. Transform response into table state
3. Initialize table configurations
4. Update local state

### Saving Tables

1. Validate table configuration
2. Transform state to GraphQL input
3. Execute mutation
4. Update local state with response

### State Updates

1. Update local state immediately
2. Mark state as dirty
3. Persist changes when needed
4. Handle errors appropriately

## Integration Points

### Parameter Store

- Access parameter definitions
- Validate parameter selections
- Sync parameter changes

### Core Store

- Basic table functionality
- Generic state management
- Error handling

### GraphQL Layer

- Handles all database operations
- Provides type-safe queries and mutations
- Manages authentication and error handling

### Transform Layer

- Converts between store and GraphQL types
- Validates data structures
- Handles type safety

## Usage Example

```typescript
// Initialize table
await tableStore.initTable({
  name: 'MyTable',
  displayName: 'My Table'
})

// Update columns
await tableStore.updateColumns(
  [
    {
      id: 'col1',
      field: 'name',
      header: 'Name',
      visible: true,
      order: 0
    }
  ],
  [] // child columns
)

// Update sorting
tableStore.setSortField('name')
tableStore.setSortOrder('ASC')

// Apply filters
tableStore.setFilter('col1', {
  value: 'test',
  operator: 'contains'
})

// Save changes
await tableStore.saveTable('table-id')
```

## Implementation Plan

1. Core State Management

   - [x] Basic store setup
   - [x] Table loading/saving
   - [x] View management
   - [ ] Error handling improvements

2. Column Management

   - [x] Basic column operations
   - [ ] Column reordering
   - [ ] Column resizing
   - [ ] Parent/child operations

3. Parameter Management

   - [x] Parameter selection
   - [ ] Parameter validation

4. Sorting & Filtering

   - [x] Basic sorting
   - [ ] Advanced sorting
   - [x] Basic filtering
   - [ ] Advanced filtering
   - [x] Category filters

5. GraphQL Integration

   - [x] Basic queries/mutations
   - [ ] Error handling
   - [ ] Caching
   - [ ] Optimistic updates

6. UI Integration
   - [x] DataTable component
   - [ ] Column customization
   - [ ] Filter UI
   - [ ] Sort UI
