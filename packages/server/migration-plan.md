# Migration Plan for Frontend-2 Reorganization

## 1. Directory Structure

```
frontend-2/
├── components/
│   ├── core/                           # Shared components
│   │   ├── tables/                     # Reusable table components
│   │   │   ├── DataTable/
│   │   │   │   ├── components/
│   │   │   │   │   └── ColumnManager/
│   │   │   │   └── composables/
│   │   │   └── shared/
│   │   └── parameters/                 # Reusable parameter components
│   │       ├── ParameterBadge.vue
│   │       └── ParameterItem.vue
│   └── viewer/                         # Viewer-specific components
│       └── schedules/                  # Schedule-specific components
│           └── components/
├── composables/
│   ├── core/                           # Core shared composables
│   │   ├── types/                      # Already organized
│   │   ├── tables/                     # Table-related composables
│   │   │   ├── useTableState.ts
│   │   │   └── useTableOperations.ts
│   │   └── parameters/                 # Parameter-related composables
│   │       ├── useParameterMappings.ts
│   │       └── useParameterOperations.ts
│   └── viewer/                         # Viewer-specific composables
│       └── parameters/                 # Viewer parameter handling
│           ├── useParameterDiscovery.ts
│           └── useBIMElements.ts
```

## 2. Component Migration Steps

### Phase 1: Core Components

1. Tables:

   - Move from: `viewer/components/tables/DataTable`
   - To: `components/core/tables/DataTable`
   - Files to migrate:
     - DataTable components
     - ColumnManager
     - Shared utilities
   - Update imports in all files using these components

2. Parameters:
   - Move from: Various locations
   - To: `components/core/parameters`
   - Files to migrate:
     - ParameterBadge.vue
     - ParameterItem.vue
   - Update parameter-related imports

### Phase 2: Core Composables

1. Table Composables:

   - Move from: `viewer/composables`
   - To: `composables/core/tables`
   - Files to migrate:
     - useTableState.ts
     - useTableOperations.ts
   - Update imports and ensure type safety

2. Parameter Composables:
   - Move from: Various locations
   - To: `composables/core/parameters`
   - Files to migrate:
     - useParameterMappings.ts
     - useParameterOperations.ts
   - Update imports and dependencies

### Phase 3: Viewer-Specific Components

1. Schedule Components:

   - Keep in: `components/viewer/schedules`
   - Refactor to use new core components
   - Update imports to use new paths

2. BIM-Related Components:
   - Keep in: `components/viewer`
   - Files to keep viewer-specific:
     - useBIMElements.ts
     - BIM-related parameter handling

## 3. Dependency Updates

1. Type Imports:

   - Update all type imports to use centralized types from `composables/core/types`
   - Ensure consistent type usage across components

2. Component Imports:

   - Update all component imports to use new paths
   - Use relative paths for closely related components
   - Use absolute paths for core components

3. Composable Imports:
   - Update composable imports to reflect new structure
   - Ensure proper typing is maintained

## 4. Testing Strategy

1. Unit Tests:

   - Update import paths in existing tests
   - Add tests for new core components
   - Verify component isolation

2. Integration Tests:
   - Test interactions between moved components
   - Verify data flow remains intact
   - Test viewer-specific functionality

## 5. Migration Order

1. Create new directory structure
2. Move core components (minimal dependencies first)
3. Move core composables
4. Update viewer-specific components
5. Update all imports
6. Run tests and fix issues
7. Verify functionality in viewer context

## 6. Safety Measures

1. Version Control:

   - Create feature branch for migration
   - Commit after each logical step
   - Use meaningful commit messages

2. Backwards Compatibility:

   - Maintain existing interfaces
   - Keep current functionality intact
   - Document any necessary changes

3. Error Handling:
   - Preserve existing error handling
   - Add additional error checks where needed

## 7. Post-Migration Tasks

1. Documentation:

   - Update component documentation
   - Document new directory structure
   - Update import examples

2. Clean-up:

   - Remove unused files
   - Clean up deprecated code
   - Update README files

3. Performance:
   - Verify bundle size
   - Check for duplicate code
   - Optimize imports

## 8. Risks and Mitigations

1. Risks:

   - Breaking changes in component interfaces
   - Missing dependencies
   - Circular dependencies
   - Type mismatches

2. Mitigations:
   - Thorough testing at each step
   - Gradual migration approach
   - Type safety checks
   - Comprehensive documentation

## 9. Timeline

1. Preparation (1 day):

   - Create new directory structure
   - Document current state
   - Set up testing environment

2. Core Migration (2-3 days):

   - Move core components
   - Update dependencies
   - Initial testing

3. Viewer Updates (1-2 days):

   - Update viewer components
   - Test viewer functionality
   - Fix any issues

4. Final Testing (1 day):
   - Complete test coverage
   - Performance testing
   - Documentation updates

Total estimated time: 5-7 days
