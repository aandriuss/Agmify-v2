const db = require('@/db/knex');

async function getUserSettings(userId) {
  // Fetch the current user settings from the DB
  const user = await db('users').where({ id: userId }).first();
  
  // Only use usersettings column
  return user?.usersettings || {};
}

async function getTables(userId) {
  // Fetch user data
  const user = await db('users').where({ id: userId }).first();
  if (!user) return {};

  // Get tables from the tables column
  let rawTables;
  try {
    // Handle both cases: when tables is already parsed by pg or still a string
    rawTables = typeof user.tables === 'string' ? JSON.parse(user.tables) : user.tables;
  } catch (err) {
    console.warn('Failed to parse tables JSON:', err);
    return {};
  }

  if (!rawTables) return {};

  // Ensure each table has all required fields with defaults
  return Object.entries(rawTables).reduce((acc, [key, table]) => {
    if (!table || typeof table !== 'object') return acc;

    // Ensure table has required fields
    const validatedTable = {
      id: table.id || key, // Use existing key as fallback for id
      name: table.name || '',
      displayName: table.displayName || table.name || '',
      parentColumns: Array.isArray(table.parentColumns) ? table.parentColumns : [],
      childColumns: Array.isArray(table.childColumns) ? table.childColumns : [],
      categoryFilters: table.categoryFilters || {
        selectedParentCategories: [],
        selectedChildCategories: []
      },
      selectedParameters: table.selectedParameters || {
        parent: [],
        child: []
      },
      filters: Array.isArray(table.filters) ? table.filters : [],
      lastUpdateTimestamp: table.lastUpdateTimestamp || Date.now(),
      // Optional fields
      description: table.description,
      metadata: table.metadata
    };

    // Ensure each column has required fields
    const validateColumns = (columns) => columns.map(col => ({
      id: col.id || '',
      name: col.name || '',
      field: col.field || '',
      header: col.header || col.name || '',
      visible: col.visible ?? true,
      removable: col.removable ?? true,
      currentGroup: col.currentGroup || '',
      // Optional fields
      type: col.type,
      source: col.source,
      category: col.category,
      order: col.order,
      width: col.width,
      sortable: col.sortable,
      filterable: col.filterable,
      metadata: col.metadata,
      headerComponent: col.headerComponent,
      fetchedGroup: col.fetchedGroup,
      description: col.description,
      isFixed: col.isFixed,
      isCustomParameter: col.isCustomParameter,
      parameterRef: col.parameterRef,
      color: col.color,
      expander: col.expander
    }));

    validatedTable.parentColumns = validateColumns(validatedTable.parentColumns);
    validatedTable.childColumns = validateColumns(validatedTable.childColumns);

    // Use table ID as key to match frontend behavior
    acc[validatedTable.id] = validatedTable;
    return acc;
  }, {});
}

async function updateUserSettings(userId, newSettings) {
  // Update both columns to maintain compatibility
  await db('users')
    .where({ id: userId })
    .update({ 
      usersettings: newSettings
    });
}

async function updateTables(userId, tables) {
  try {
    // Log incoming data for debugging
    console.log('Received tables update request:', {
      userId,
      tableData: JSON.stringify(tables, null, 2)
    });

    // First check if user exists and get existing tables
    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      console.error('User not found:', userId);
      return false;
    }

    // Get existing tables
    let existingTables = {};
    try {
      existingTables = typeof user.tables === 'string' ? 
        JSON.parse(user.tables) : 
        (user.tables || {});
    } catch (err) {
      console.warn('Failed to parse existing tables:', err);
    }

    // Merge new tables with existing ones
    const tableData = {
      ...existingTables,
      ...tables
    };

    // Validate and normalize table data
    const validatedTables = Object.entries(tableData).reduce((acc, [key, table]) => {
      try {
        if (!table || typeof table !== 'object') {
          console.warn(`Invalid table data for key ${key}, skipping:`, table);
          return acc;
        }

        // Validate required fields
        if (!table.id || !table.name) {
          console.warn(`Missing required fields for table ${key}:`, {
            id: table.id,
            name: table.name
          });
          return acc;
        }

        // Validate and normalize columns
        const validateColumns = (columns) => {
          if (!Array.isArray(columns)) {
            console.warn(`Invalid columns data for table ${key}:`, columns);
            return [];
          }
          return columns.map(col => {
            if (!col || typeof col !== 'object') {
              console.warn(`Invalid column data in table ${key}:`, col);
              return null;
            }
            return {
              id: col.id || '',
              name: col.name || '',
              field: col.field || '',
              header: col.header || col.name || '',
              visible: col.visible ?? true,
              removable: col.removable ?? true,
              currentGroup: col.currentGroup || '',
              // Optional fields
              type: col.type,
              source: col.source,
              category: col.category,
              order: col.order,
              width: col.width,
              sortable: col.sortable,
              filterable: col.filterable,
              metadata: col.metadata,
              headerComponent: col.headerComponent,
              fetchedGroup: col.fetchedGroup,
              description: col.description,
              isFixed: col.isFixed,
              isCustomParameter: col.isCustomParameter,
              parameterRef: col.parameterRef,
              color: col.color,
              expander: col.expander
            };
          }).filter(Boolean); // Remove any invalid columns
        };

        const parentColumns = validateColumns(table.parentColumns);
        const childColumns = validateColumns(table.childColumns);
        const filters = Array.isArray(table.filters) ? table.filters : [];

        // Validate and normalize parameters
        const validateParameters = (params) => {
          if (!Array.isArray(params)) {
            console.warn(`Invalid parameters data for table ${key}:`, params);
            return [];
          }
          return params.map(param => {
            if (!param || typeof param !== 'object') {
              console.warn(`Invalid parameter data in table ${key}:`, param);
              return null;
            }
            return {
              id: param.id || '',
              name: param.name || '',
              kind: param.kind || 'bim',
              type: param.type || 'string',
              value: param.value === null || param.value === '' || param.value === 'null' ? null : param.value,
              visible: param.visible ?? true,
              order: param.order ?? 0,
              group: param.group || '',
              category: param.category,
              description: param.description,
              metadata: param.metadata
            };
          }).filter(Boolean); // Remove any invalid parameters
        };

        const selectedParameters = {
          parent: validateParameters(table.selectedParameters?.parent),
          child: validateParameters(table.selectedParameters?.child)
        };

        // Validate and normalize category filters
        const categoryFilters = {
          selectedParentCategories: Array.isArray(table.categoryFilters?.selectedParentCategories) 
            ? table.categoryFilters.selectedParentCategories 
            : [],
          selectedChildCategories: Array.isArray(table.categoryFilters?.selectedChildCategories)
            ? table.categoryFilters.selectedChildCategories
            : []
        };

        // Build validated table object
        acc[table.id] = {
          id: table.id,
          name: table.name,
          displayName: table.displayName || table.name,
          parentColumns,
          childColumns,
          categoryFilters,
          selectedParameters,
          filters,
          lastUpdateTimestamp: table.lastUpdateTimestamp || Date.now(),
          description: table.description,
          metadata: table.metadata
        };

        return acc;
      } catch (err) {
        console.error(`Error processing table ${key}:`, err);
        return acc;
      }
    }, {});

    // Check if we have any valid tables
    if (Object.keys(validatedTables).length === 0) {
      console.error('No valid tables found in input data');
      return false;
    }

    // Log validated data before saving
    console.log('Validated tables data:', {
      userId,
      tableCount: Object.keys(validatedTables).length,
      tableIds: Object.keys(validatedTables),
      validatedData: JSON.stringify(validatedTables, null, 2)
    });

    // PostgreSQL JSONB requires the entire object to be stringified
    const result = await db('users')
      .where({ id: userId })
      .update({ 
        tables: JSON.stringify(validatedTables)
      });

    if (!result) {
      console.error('No rows were updated');
      return false;
    }

    // Log success
    console.log('Tables updated successfully:', {
      userId,
      tableCount: Object.keys(validatedTables).length,
      tableIds: Object.keys(validatedTables)
    });

    return true;
  } catch (error) {
    console.error('Failed to update tables:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      data: {
        userId,
        tableCount: tables ? Object.keys(tables).length : 0,
        tables: JSON.stringify(tables, null, 2)
      }
    });
    return false;
  }
}

module.exports = {
  getUserSettings,
  getTables,
  updateUserSettings,
  updateTables
};
