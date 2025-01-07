const db = require('@/db/knex');

async function getUserSettings(userId) {
  // Fetch the current user settings from the DB
  const user = await db('users').where({ id: userId }).first();
  
  // Try both settings and usersettings columns, with usersettings taking precedence
  return user ? (user.usersettings || user.settings || {}) : {};
}

async function getTables(userId) {
  // Fetch user data
  const user = await db('users').where({ id: userId }).first();
  if (!user) return {};

  // First try to get tables from the new tables column
  let rawTables;
  try {
    // Handle both cases: when tables is already parsed by pg or still a string
    rawTables = typeof user.tables === 'string' ? JSON.parse(user.tables) : user.tables;
  } catch (err) {
    console.warn('Failed to parse tables JSON:', err);
    // Fall back to tables from usersettings if they exist
    const settings = user.usersettings || user.settings || {};
    try {
      rawTables = typeof settings.tables === 'string' ? JSON.parse(settings.tables) : settings.tables;
    } catch (err) {
      console.warn('Failed to parse settings.tables JSON:', err);
      rawTables = null;
    }
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
      selectedParameterIds: Array.isArray(table.selectedParameterIds) ? table.selectedParameterIds : [],
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
  // Ensure we have a valid object
  const tableData = tables || {};

  // Store directly since values are already stringified by transformTableToInput
  await db('users')
    .where({ id: userId })
    .update({ tables: tableData });
  return true;
}

module.exports = {
  getUserSettings,
  getTables,
  updateUserSettings,
  updateTables
};
