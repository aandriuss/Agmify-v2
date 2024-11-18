# Schedule System Implementation Prompt

## Current Status

We've made progress with:

- Basic data loading working
- Store initialization fixed
- Initial rendering working
- Debug view showing data (80 rows)

## Next Phase: Restore Existing DataTable

### 1. Identify Current Issues

1. DataTable component is not showing despite data being available
2. Category filters are missing
3. Column management modal is missing
4. Table settings are not being loaded

### 2. Component Investigation

Need to check:

1. `components/tables/DataTable/index.vue` - existing table component
2. `ScheduleColumnManagement.vue` - column management
3. `ScheduleCategoryFilters.vue` - category filtering
4. `ScheduleParameterManagerModal.vue` - parameter management

### 3. Implementation Steps

#### Step 1: Restore DataTable Display

1. Check DataTable component integration in ScheduleTableView.vue
2. Verify props being passed to DataTable
3. Ensure store data is properly connected
4. Remove any blocking conditions in table rendering

#### Step 2: Restore Category Management

1. Re-enable ScheduleCategoryFilters component
2. Connect category selection to store
3. Verify category filtering logic
4. Restore category UI state

#### Step 3: Restore Column Management

1. Re-enable column management modal
2. Connect column visibility state
3. Restore column ordering functionality
4. Re-enable column settings persistence

### 4. Key Files to Check

```
components/table/
├── ScheduleTableView.vue       // Main table container
├── DataTable/
│   ├── index.vue              // Existing table component
│   └── components/
│       └── TableWrapper.vue   // Table wrapper component

components/
├── ScheduleCategoryFilters.vue    // Category management
├── ScheduleColumnManagement.vue   // Column management
└── ScheduleParameterManagerModal.vue // Parameter management
```

### 5. Required Changes

#### ScheduleTableView.vue

```typescript
// Remove blocking conditions
- Remove initialization checks
- Show table when data is available
- Keep error handling
```

#### DataTable Integration

```typescript
// Restore table props
<DataTable
  :data="tableData"          // Direct from store
  :columns="tableColumns"    // From column management
  :settings="tableSettings"  // From store
  @update="handleUpdate"
/>
```

#### Category Management

```typescript
// Restore category filters
<ScheduleCategoryFilters
  :parent-categories="parentCategories"
  :child-categories="childCategories"
  :selected-parent="selectedParent"
  :selected-child="selectedChild"
  @update:selection="handleCategoryUpdate"
/>
```

#### Column Management

```typescript
// Restore column manager
<ScheduleColumnManagement
  v-if="showColumnManager"
  :columns="availableColumns"
  :visible-columns="visibleColumns"
  @update:visibility="handleColumnVisibility"
  @update:order="handleColumnOrder"
/>
```

### 6. Success Criteria

#### DataTable

- [ ] Table shows when data is available
- [ ] Data is properly formatted
- [ ] Sorting works
- [ ] Filtering works

#### Category Management

- [ ] Category filters are visible
- [ ] Parent/child selection works
- [ ] Filtering updates table
- [ ] Selection persists

#### Column Management

- [ ] Column manager modal works
- [ ] Column visibility toggles work
- [ ] Column ordering works
- [ ] Settings persist

### 7. Next Steps

1. Review existing DataTable component
2. Check component mounting order
3. Verify data flow to table
4. Test category filtering
5. Test column management
6. Verify settings persistence
7. Add any missing functionality
8. Polish UI interactions

### 8. Questions to Answer

1. Is the DataTable component being properly mounted?
2. Are we passing the correct props to the table?
3. Is the category filtering logic working?
4. Are column settings being properly loaded?
5. Is the store data flowing correctly?
6. Are we blocking the table unnecessarily?
7. Are all required components imported?
8. Are event handlers properly connected?

### 9. Implementation Order

1. Fix table display
2. Restore category filters
3. Restore column management
4. Fix settings persistence
5. Polish interactions
6. Add error handling
7. Improve performance
8. Update documentation
