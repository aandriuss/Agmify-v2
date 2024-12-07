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
  let rawTables = user.tables;

  // Fall back to tables from usersettings if they exist
  if (!rawTables) {
    const settings = user.usersettings || user.settings || {};
    rawTables = settings.tables;
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
      usersettings: JSON.stringify(newSettings),
      settings: JSON.stringify(newSettings) // Keep settings in sync
    });
}

async function updateTables(userId, tables) {
  await db('users')
    .where({ id: userId })
    .update({ tables });
  return true;
}

module.exports = {
  getUserSettings,
  getTables,
  updateUserSettings,
  updateTables
};
