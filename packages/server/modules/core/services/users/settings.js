const db = require('@/db/knex');

async function getUserSettings(userId) {
  // Fetch the current user settings from the DB
  const user = await db('users').where({ id: userId }).first();
  
  // Try both settings and usersettings columns, with usersettings taking precedence
  return user ? (user.usersettings || user.settings || {}) : {};
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

module.exports = {
  getUserSettings,
  updateUserSettings
};
