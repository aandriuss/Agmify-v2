# Schedule System Development Instructions

## Overview

The Schedule system is a Vue.js component for displaying and managing BIM (Building Information Modeling) data in a tabular format. It handles complex relationships between building elements while maintaining their independence.

## Key Concepts

### Element Independence

- Each BIM element is independent in the raw data
- Elements have their own parameters and properties
- No inherent parent-child relationships in raw data

### Category System

- Predefined parent categories (Walls, Floors, etc.)
- Predefined child categories (Windows, Doors, etc.)
- Categories defined in config/categories.ts

### Relationship Establishment

- Parent-child relationships created after filtering
- Matching based on child.host === parent.mark
- Orphaned children grouped under "Without Host"

### Data Flow

1. Load raw BIM elements independently
2. Filter elements by predefined categories
3. Establish relationships through host-mark matching
4. Process parameters for each element
5. Create parameter columns for display

## Development Guidelines

### Element Processing

- Always treat elements as independent first
- Use predefined categories for filtering
- Establish relationships after filtering
- Handle orphaned elements properly

### Parameter Handling

- Discover parameters from raw elements
- Process parameters independently
- Create parameter columns after relationships
- Handle parameter updates efficiently

### Error Handling

- Validate element categories
- Check host-mark relationships
- Handle orphaned elements gracefully
- Provide clear error messages

### Performance Considerations

- Process elements in batches
- Cache relationship mappings
- Optimize parameter discovery
- Handle large datasets efficiently

## Testing Focus Areas

1. Element independence verification
2. Category filtering accuracy
3. Host-mark relationship matching
4. Parameter discovery and processing
5. Error handling and recovery

## Documentation Requirements

1. Update architecture.md for changes
2. Keep implementation.md current
3. Document data flow clearly
4. Maintain debugging guides
