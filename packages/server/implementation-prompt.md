# Schedule System Implementation Task

## Current Task: Fix Blank DataTable and Debug Data

### Context

The Schedules component is currently not displaying data despite:

- Basic data loading working
- Store initialization fixed
- Initial rendering working
- Debug view showing data (80 rows)

### Recent Changes

1. Fixed data access in TableWrapper:

```diff
- <div class="truncate">{{ data.data[col.field] }}</div>
+ <div class="truncate">{{ data[col.field] }}</div>
```

2. Updated category initialization in defaultColumns.ts:

```typescript
export const defaultTable: NamedTableConfig = {
  categoryFilters: {
    selectedParentCategories: parentCategories,
    selectedChildCategories: childCategories
  }
}
```

### Key Components

1. Main Component:

```
components/
└── Schedules.vue                 // Main container
    ├── ScheduleTableView         // Table container
    │   └── TableWrapper         // PrimeVue table wrapper
    └── BIMDebugView            // Debug panel
```

2. State Management:

```
composables/
├── useScheduleStore.ts          // Central store
├── useScheduleState.ts          // State management
└── useScheduleSetup.ts         // Setup coordination
```

3. Data Flow:

```
Store -> ScheduleState -> Components
  ↑          ↑              ↓
  └── Data ──┴── Debug ─────┘
```

### Current Issues

1. DataTable component not showing despite data being available
2. Category filters missing
3. Column management modal missing
4. Table settings not being loaded

### Files to Check

1. Main Components:

```
components/tables/DataTable/index.vue        // Main table component
components/tables/DataTable/TableWrapper.vue // Table wrapper
```

2. State Management:

```
composables/useScheduleState.ts             // State management
composables/useScheduleStore.ts            // Store management
```

3. Data Transformation:

```
utils/dataPipeline.ts                      // Data processing
utils/dataConversion.ts                   // Data conversion
```

### Debug Information

Current debug output shows:

```
[data-transform] Table data changed: ▸ {
  timestamp: "2024-11-18T12:42:49.1132",
  count: 0,
  isFullTransform: false,
  validation: {-}
}
```

### Next Steps

1. Verify data flow:

   - Check store initialization
   - Verify state updates
   - Validate data transformation

2. Debug component rendering:

   - Check component mounting
   - Verify prop passing
   - Validate template conditions

3. Fix table display:
   - Update data access
   - Fix category filters
   - Restore column management

### Success Criteria

- [ ] DataTable shows when data is available
- [ ] Data is properly formatted
- [ ] Sorting works
- [ ] Filtering works
- [ ] Category filters are visible
- [ ] Column management works
- [ ] Settings persist

### Implementation Plan

1. Check data pipeline:

   - Store initialization
   - Data transformation
   - State updates

2. Fix component rendering:

   - Component mounting
   - Prop validation
   - Template conditions

3. Restore functionality:
   - Category filters
   - Column management
   - Table settings

### Resources

1. Key Types:

```typescript
interface TableRowData {
  id: string
  mark: string
  category: string
  type: string
  parameters: Record<string, unknown>
  details?: TableRowData[]
  _visible: boolean
}

interface ColumnDef {
  field: string
  header: string
  type: string
  visible: boolean
  order: number
  removable: boolean
  isFixed?: boolean
}
```

2. Component Props:

```typescript
interface Props {
  tableData: TableRowData[]
  columns: ColumnDef[]
  loading?: boolean
  sortField?: string
  sortOrder?: number
  filters?: Record<string, unknown>
}
```

3. Store State:

```typescript
interface StoreState {
  scheduleData: ElementData[]
  tableData: TableRowData[]
  currentTableColumns: ColumnDef[]
  selectedCategories: Set<string>
  initialized: boolean
  loading: boolean
  error: Error | null
}
```
