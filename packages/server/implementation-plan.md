# Schedule Component Implementation Plan

## Data Flow & Processing

### 1. Parameter Sources & Processing

#### A. Raw Parameter Extraction

```typescript
// From BIM elements
elements.forEach((element) => {
  Object.entries(element.parameters).forEach(([key, value]) => {
    // 1. Group Detection
    const group = detectGroup(key) // e.g., "Parameters", "Base", "Constraints"

    // 2. Special Handling
    if (isJsonString(value)) {
      // Handle nested parameters
      extractNestedParameters(value)
    }

    // 3. Create Raw Parameter
    createRawParameter({
      id: key,
      name: getName(key),
      value: value,
      sourceGroup: group,
      metadata: {
        category: element.category,
        elementId: element.id
      }
    })
  })
})
```

#### B. Parameter Classification

```typescript
// Determine if parameter is BIM or user
function classifyParameter(raw: RawParameter): 'bim' | 'user' {
  // 1. Check Source Groups
  if (isStandardGroup(raw.sourceGroup)) return 'bim' // e.g., 'Pset_', 'Base'

  // 2. Check Patterns
  if (isBimPattern(raw.id)) return 'bim' // e.g., 'IFCWALL', '.Type'

  // 3. Check Metadata
  if (raw.metadata.isSystem) return 'bim'

  return 'user' // Default to user parameter
}
```

#### C. Value Processing

```typescript
// Convert and type raw values
function processValue(raw: RawParameter): ParameterValue {
  // 1. Type Inference
  const type = inferType(raw) // Based on value and context

  // 2. Value Conversion
  const value = convertValue(raw.value, type)

  // 3. Special Cases
  if (isEquation(value)) handleEquation(value)
  if (isObject(value)) handleObject(value)

  return { type, value }
}
```

### 2. User Interaction Points

#### A. Parameter Manager

```typescript
// User selects parameters to display
interface ParameterManager {
  // 1. Parameter Groups
  availableGroups: {
    bim: string[] // e.g., "Base", "Constraints"
    user: string[] // Custom groups
  }

  // 2. Selection Actions
  actions: {
    selectParameter(param: AvailableParameter): void
    deselectParameter(paramId: string): void
    reorderParameters(fromIndex: number, toIndex: number): void
  }

  // 3. Visibility
  visibility: {
    showGroup(group: string, visible: boolean): void
    showParameter(paramId: string, visible: boolean): void
  }
}
```

#### B. Table Interaction

```typescript
// User interacts with displayed data
interface TableInteraction {
  // 1. Column Management
  columns: {
    show(columnId: string): void
    hide(columnId: string): void
    reorder(fromIndex: number, toIndex: number): void
  }

  // 2. Category Filtering
  categories: {
    selectParentCategory(category: string): void
    selectChildCategory(category: string): void
  }

  // 3. Data Display
  display: {
    sortBy(columnId: string): void
    filterBy(criteria: FilterCriteria): void
  }
}
```

### 3. Store Synchronization

#### A. Store Responsibilities & Dependencies

```typescript
// 1. Parameter Store (Source of Truth for Parameters)
interface ParameterStore {
  // Owns raw and processed parameters
  parentRawParameters: RawParameter[]
  parentAvailableBimParameters: AvailableBimParameter[]

  // No dependencies on other stores
  // Other stores depend on this
}

// 2. Table Store (Source of Truth for Display Structure)
interface TableStore {
  // Depends on Parameter Store for:
  - Selected parameters
  - Parameter visibility
  - Parameter order

  // Owns:
  - Table structure
  - Column definitions
  - Category filters
}

// 3. Core Store (Source of Truth for Current View)
interface CoreStore {
  // Depends on both stores for:
  - Current data from Parameter Store
  - Display structure from Table Store

  // Owns:
  - Current view state
  - UI interactions
  - Temporary changes
}
```

#### B. Update Flow

```typescript
// 1. Parameter Updates
async function handleParameterUpdate() {
  // Start in Parameter Store
  const processed = await parameterStore.processParameters(rawParams)

  // Update Table Store
  await tableStore.updateSelectedParameters({
    parent: processed.parent,
    child: processed.child
  })

  // Finally update view
  await store.setViewData({
    data: processed,
    columns: tableStore.currentTable.value.columns
  })
}

// 2. Table Updates
async function handleTableUpdate() {
  // Start in Table Store
  const updated = await tableStore.updateTable(changes)

  // Only update view, not parameters
  await store.setViewData({
    columns: updated.columns
  })
}

// 3. View Updates
async function handleViewUpdate() {
  // Only in Core Store
  await store.updateView(changes)

  // No need to update other stores
  // View changes are temporary
}
```

#### C. Initialization Order

```typescript
async function initializeStores() {
  // 1. Parameter Store First
  await parameterStore.init()
  if (parameterStore.hasExistingData()) {
    await parameterStore.processExistingData()
  }

  // 2. Table Store Second
  await tableStore.init()
  if (parameterStore.hasProcessedData()) {
    await tableStore.createFromParameters(parameterStore.getProcessedParameters())
  }

  // 3. Core Store Last
  await store.init()
  await store.setInitialView({
    data: parameterStore.getProcessedData(),
    columns: tableStore.getCurrentColumns()
  })
}
```

### 4. Data Persistence

#### A. Parameter State

```typescript
// What gets saved
interface SavedState {
  // 1. Selected Parameters
  selected: {
    parent: SelectedParameter[]
    child: SelectedParameter[]
  }

  // 2. Display Settings
  display: {
    visibleColumns: string[]
    columnOrder: string[]
    sortBy?: string
    filterBy?: FilterCriteria
  }

  // 3. Categories
  categories: {
    selectedParent: string[]
    selectedChild: string[]
  }
}
```

#### B. State Updates

```typescript
// When to save
const stateUpdates = {
  // 1. Parameter Selection
  onParameterSelect: debounce(() => saveState(), 500),

  // 2. Display Changes
  onDisplayUpdate: debounce(() => saveState(), 500),

  // 3. Category Changes
  onCategoryChange: () => saveState() // Immediate save
}
```

1. Raw Parameters (Initial Data)

```typescript
interface RawParameter {
  id: string
  name: string
  value: unknown
  sourceGroup: string
  metadata: ParameterMetadata
}
```

- Come from BIM elements
- Unprocessed, raw values
- Grouped by source (e.g., "Parameters", "Base", "Constraints")

2. Available Parameters (Processed Data)

```typescript
// BIM Parameters (from model)
interface AvailableBimParameter {
  kind: 'bim'
  id: string
  name: string
  type: BimValueType
  value: ParameterValue
  sourceGroup: string // Original group
  currentGroup: string // Current display group
  visible?: boolean
  isSystem: boolean
}

// User Parameters (custom)
interface AvailableUserParameter {
  kind: 'user'
  id: string
  name: string
  type: UserValueType
  value: ParameterValue
  group: string
  visible: boolean
  equation?: string
}
```

- Processed and typed values
- Separated into BIM and user parameters
- Ready for display but not yet selected

3. Selected Parameters (Display Data)

```typescript
interface SelectedParameter {
  id: string
  name: string
  kind: 'bim' | 'user'
  type: BimValueType | UserValueType
  value: ParameterValue
  group: string
  visible: boolean
  order: number
}
```

- Chosen for display in table
- Have display properties (order, visibility)
- Used to create table columns

### User Interaction Flow

1. Initial Load

- Load BIM elements → Get raw parameters
- Process into available parameters
- Load saved selected parameters or use defaults
- Create table columns from selected parameters

2. Parameter Selection

- User opens parameter manager
- Sees available parameters grouped by source
- Can select/deselect parameters
- Can reorder selected parameters
- Changes update table immediately

3. Table Interaction

- User can show/hide columns
- Can reorder columns
- Can filter by categories
- Changes persist in selected parameters

## Current Issues

- Complex initialization sequence
- Unclear store responsibilities
- Circular dependencies between stores
- Aggressive error handling blocking data flow

## Implementation Steps

## Store Responsibilities

### 1. Parameter Store (Data Processing)

#### State

```typescript
interface ParameterStore {
  // Collections for both parent and child
  collections: {
    parent: {
      raw: RawParameter[] // From BIM
      available: {
        // After processing
        bim: AvailableBimParameter[] // From model
        user: AvailableUserParameter[] // Custom
      }
      selected: SelectedParameter[] // For display
    }
    child: {
      // Same structure as parent
    }
  }
}
```

#### Actions

```typescript
interface ParameterActions {
  // Data Processing
  setRawParameters(params: RawParameter[], isParent: boolean): void
  processParameters(params: RawParameter[]): Promise<AvailableParameter[]>

  // Selection Management
  selectParameter(param: AvailableParameter): void
  deselectParameter(paramId: string): void
  reorderParameter(paramId: string, newOrder: number): void

  // Visibility
  updateVisibility(paramId: string, visible: boolean): void
}
```

#### Table Store (Focus: Structure)

```typescript
// Clear responsibilities
interface TableStore {
  // Table structure
  currentTable: TableSettings
  columns: {
    parent: TableColumn[]
    child: TableColumn[]
  }

  // Core actions
  createColumnsFromParameters(params: ProcessedParameter[]): TableColumn[]
  updateColumnVisibility(columnId: string, visible: boolean): void
}
```

#### Core Store (Focus: View State)

```typescript
// Clear responsibilities
interface CoreStore {
  // Current view data
  currentData: ElementData[]
  currentColumns: TableColumn[]

  // UI state
  categories: {
    parent: string[]
    child: string[]
  }

  // Core actions
  setViewData(data: ElementData[], columns: TableColumn[]): void
  updateCategories(categories: Categories): void
}
```

### 2. Create Clean Data Flow

#### Step 1: Parameter Processing

```typescript
// In parameter-processing.ts
async function processParameters(rawParams: Parameter[]) {
  // 1. Group parameters
  const grouped = groupParameters(rawParams)

  // 2. Process each group
  const processed = await Promise.all(grouped.map(processParameterGroup))

  // 3. Return processed results
  return {
    parent: processed.filter((p) => !p.isChild),
    child: processed.filter((p) => p.isChild)
  }
}
```

#### Step 2: Table Creation

```typescript
// In table-creation.ts
function createTableStructure(params: ProcessedParameter[]) {
  // 1. Create columns
  const columns = createColumnsFromParameters(params)

  // 2. Set visibility
  const visibleColumns = filterVisibleColumns(columns)

  // 3. Create table settings
  return {
    columns,
    visibleColumns,
    settings: createDefaultSettings()
  }
}
```

#### Step 3: View Updates

```typescript
// In view-updates.ts
function updateView(params: ProcessedParameter[], table: TableSettings) {
  // 1. Create view data
  const viewData = createViewData(params)

  // 2. Apply table settings
  const displayData = applyTableSettings(viewData, table)

  // 3. Return view state
  return {
    data: displayData,
    columns: table.visibleColumns
  }
}
```

### 3. Implement Clean Initialization

#### In Schedules.vue

```typescript
async function initializeSchedules() {
  try {
    // 1. Get initial parameters
    const rawParams = await parameterStore.getRawParameters()

    // 2. Process parameters
    const processed = await parameterStore.processParameters(rawParams)

    // 3. Create table structure
    const table = await tableStore.createTable(processed)

    // 4. Update view
    await store.setViewData({
      data: processed,
      columns: table.columns
    })

    // 5. Try to get additional data (but don't block)
    getBIMData().catch((err) => {
      debug.warn('Additional data fetch failed:', err)
    })
  } catch (err) {
    handleError(err)
  }
}
```

### 4. Error Handling & Recovery

#### A. Error Hierarchy

```typescript
// 1. Parameter Store Errors (Most Critical)
interface ParameterError {
  type: 'parameter'
  level: 'fatal' | 'recoverable'
  source: 'raw' | 'processing' | 'validation'
  canContinue: boolean
}

// 2. Table Store Errors (Can Fall Back)
interface TableError {
  type: 'table'
  level: 'structure' | 'display'
  source: 'columns' | 'settings' | 'persistence'
  canUseDefault: boolean
}

// 3. View Store Errors (Least Critical)
interface ViewError {
  type: 'view'
  level: 'ui' | 'interaction'
  source: 'display' | 'update'
  canRetry: boolean
}
```

#### B. Error Handling Strategy

```typescript
// 1. Parameter Store (Critical Path)
async function handleParameterError(err: ParameterError) {
  if (err.level === 'fatal') {
    // Can't continue without parameters
    throw new Error('Cannot load parameters')
  }

  if (err.source === 'processing') {
    // Try to use raw data
    return createBasicParameters(rawData)
  }

  // Fall back to defaults
  return defaultParameters
}

// 2. Table Store (Can Fall Back)
async function handleTableError(err: TableError) {
  if (err.canUseDefault) {
    // Use default table
    return createDefaultTable()
  }

  if (err.source === 'columns') {
    // Try to recreate columns
    return recreateColumnsFromParameters()
  }

  // Continue with partial functionality
  return partialTable
}

// 3. View Store (Can Recover)
async function handleViewError(err: ViewError) {
  if (err.canRetry) {
    // Retry view update
    return retryViewUpdate()
  }

  // Continue with basic view
  return basicView
}
```

#### C. Recovery Strategies

```typescript
// 1. Parameter Recovery
const parameterRecovery = {
  // Try to recover raw parameters
  async recoverRawParameters() {
    // 1. Check cache
    const cached = await loadFromCache()
    if (cached) return cached

    // 2. Try basic extraction
    return extractBasicParameters()
  },

  // Create minimal parameters
  createMinimalParameters() {
    return {
      id: generateId(),
      name: 'Unknown',
      value: null
    }
  }
}

// 2. Table Recovery
const tableRecovery = {
  // Create basic table
  createBasicTable() {
    return {
      columns: createBasicColumns(),
      settings: defaultSettings
    }
  },

  // Restore from last known good state
  async restoreTable() {
    const saved = await loadLastGoodState()
    return saved || createBasicTable()
  }
}

// 3. View Recovery
const viewRecovery = {
  // Reset to basic view
  resetView() {
    return {
      data: [],
      columns: [],
      loading: false
    }
  },

  // Try to rebuild view
  async rebuildView() {
    if (hasValidParameters()) {
      return createViewFromParameters()
    }
    return resetView()
  }
}
```

#### D. Fallback States

```typescript
// Default states when errors occur
const fallbacks = {
  // 1. Parameter Fallbacks
  parameters: {
    raw: [],
    available: {
      bim: [],
      user: []
    },
    selected: defaultSelectedParameters
  },

  // 2. Table Fallbacks
  table: {
    columns: defaultColumns,
    settings: defaultSettings,
    filters: defaultFilters
  },

  // 3. View Fallbacks
  view: {
    data: [],
    columns: [],
    ui: defaultUiState
  }
}
```

## Implementation Order

1. Start with Parameter Store

   - Simplify parameter processing
   - Remove dependencies on other stores
   - Add better error handling

2. Update Table Store

   - Focus on table structure
   - Remove parameter processing logic
   - Add column management

3. Clean up Core Store

   - Focus on view state
   - Remove business logic
   - Add UI state management

4. Update Schedules.vue
   - Implement clean initialization
   - Add proper error boundaries
   - Remove complex conditionals

## Expected Results

- Clear data flow direction
- Each store has single responsibility
- No circular dependencies
- Better error handling
- Simpler maintenance
