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

  // Return tables directly - already JSON parsed by pg
  return user.tables || {};
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
    // Check if user exists
    const user = await db('users').where({ id: userId }).first();
    if (!user) return false;

    // Save tables directly - GraphQL schema ensures proper structure
    const result = await db('users')
      .where({ id: userId })
      .update({ 
        tables // PostgreSQL will handle JSON conversion
      });

    return result > 0;
  } catch (error) {
    console.error('Failed to update tables:', error);
    return false;
  }
}

module.exports = {
  getUserSettings,
  getTables,
  updateUserSettings,
  updateTables
};
