// This file has been migrated to:
// - useElementsData for parameter processing and extraction
// - parameter-processing.ts for value transformation and validation
// - parameter store for state management
// - useTableFlow for table configuration

// See composables/core/parameters/next/MIGRATION.md for details on the new parameter system architecture:
// - Clear state transitions (RawParameter -> AvailableBimParameter/AvailableUserParameter -> SelectedParameter)
// - Type-safe operations through parameter-states.ts
// - Centralized state management through parameter store
// - Separation of concerns:
//   * useElementsData: Handles parameter extraction and processing
//   * useParameters: Handles UI interactions
//   * parameter store: Manages state
//   * parameter-processing.ts: Handles value transformation

// The functionality from this file has been distributed:
// - processParameters -> useElementsData.processParameters
// - extractAllParameters -> parameter-processing.extractRawParameters
// - processParameterObject -> parameter-processing.processRawParameters
// - establishRelationships -> useElementsData relationship handling
// - splitElementsByCategory -> useElementsData category handling

export {}
