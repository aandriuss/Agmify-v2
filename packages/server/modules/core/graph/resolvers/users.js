const {
  getUser,
  getUserByEmail,
  getUserRole,
  deleteUser,
  searchUsers,
  changeUserRole,
  updateUser
} = require('@/modules/core/services/users')
const { updateUserAndNotify } = require('@/modules/core/services/users/management')
const { ActionTypes } = require('@/modules/activitystream/helpers/types')
const { validateScopes } = require('@/modules/shared')
const zxcvbn = require('zxcvbn')
const {
  getAdminUsersListCollection,
  getTotalCounts
} = require('@/modules/core/services/users/adminUsersListService')
const { Roles, Scopes } = require('@speckle/shared')
const { markOnboardingComplete } = require('@/modules/core/repositories/users')
const { UsersMeta } = require('@/modules/core/dbSchema')
const { getServerInfo } = require('@/modules/core/services/generic')
const { throwForNotHavingServerRole } = require('@/modules/shared/authz')
const {
  deleteAllUserInvitesFactory,
  countServerInvitesFactory,
  findServerInvitesFactory
} = require('@/modules/serverinvites/repositories/serverInvites')
const db = require('@/db/knex')
const { BadRequestError } = require('@/modules/shared/errors')
const { saveActivityFactory } = require('@/modules/activitystream/repositories')
const { 
  getUserSettings, 
  getTables, 
  updateTables,
  updateUserSettings 
} = require('@/modules/core/services/users/settings')

/** @type {import('@/modules/core/graph/generated/graphql').Resolvers} */
const resolvers = {
  Query: {
    async _() {
      return `Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn.`
    },
    async activeUser(_parent, _args, context) {
      const activeUserId = context.userId
      if (!activeUserId) return null

      // Only if authenticated - check for server roles & scopes
      await throwForNotHavingServerRole(context, Roles.Server.Guest)
      await validateScopes(context.scopes, Scopes.Profile.Read)

      return await getUser(activeUserId)
    },
    async otherUser(_parent, args) {
      const { id } = args
      if (!id) return null
      return await getUser(id)
    },
    async user(parent, args, context) {
      // User wants info about himself and he's not authenticated - just return null
      if (!context.auth && !args.id) return null

      await throwForNotHavingServerRole(context, Roles.Server.Guest)

      if (!args.id) await validateScopes(context.scopes, Scopes.Profile.Read)
      else await validateScopes(context.scopes, Scopes.Users.Read)

      if (!args.id && !context.userId) {
        throw new BadRequestError('You must provide an user id.')
      }

      return await getUser(args.id || context.userId)
    },

    async adminUsers(_parent, args) {
      return await getAdminUsersListCollection({
        findServerInvites: findServerInvitesFactory({ db }),
        getTotalCounts: getTotalCounts({
          countServerInvites: countServerInvitesFactory({ db })
        })
      })(args)
    },

    async userSearch(parent, args, context) {
      await throwForNotHavingServerRole(context, Roles.Server.Guest)
      await validateScopes(context.scopes, Scopes.Profile.Read)
      await validateScopes(context.scopes, Scopes.Users.Read)

      if (args.query.length < 3)
        throw new BadRequestError('Search query must be at least 3 carachters.')

      if (args.limit && args.limit > 100)
        throw new BadRequestError(
          'Cannot return more than 100 items, please use pagination.'
        )

      const { cursor, users } = await searchUsers(
        args.query,
        args.limit,
        args.cursor,
        args.archived,
        args.emailOnly
      )
      return { cursor, items: users }
    },

    async userPwdStrength(parent, args) {
      const res = zxcvbn(args.pwd)
      return { score: res.score, feedback: res.feedback }
    }
  },

  User: {
    async email(parent, args, context) {
      if (context.userId === parent.id) {
        try {
          await validateScopes(context.scopes, Scopes.Profile.Email)
          return parent.email
        } catch {
          return null
        }
      }

      try {
        await throwForNotHavingServerRole(context, Roles.Server.Admin)
        await validateScopes(context.scopes, Scopes.Users.Email)
        return parent.email
      } catch {
        return null
      }
    },
    async role(parent) {
      return await getUserRole(parent.id)
    },
    async isOnboardingFinished(parent, _args, ctx) {
      const metaVal = await ctx.loaders.users.getUserMeta.load({
        userId: parent.id,
        key: UsersMeta.metaKey.isOnboardingFinished
      })
      return !!metaVal?.value
    },
    async userSettings(parent, args, context) {
      // Check authentication
      if (!context.userId) throw new Error('User not authenticated')
      
      // Get settings for the user
      return await getUserSettings(parent.id)
    },
    async tables(parent, args, context) {
      // Check authentication
      if (!context.userId) throw new Error('User not authenticated')
      
      // Get tables for the user
      return await getTables(parent.id)
    },

    async parameters(parent, _args, context) {
      // Check authentication
      if (!context.userId) throw new Error('User not authenticated')
      
      // Return parameters from parent if available
      const parameters = parent.parameters || {}
      
      // Ensure parameters is an object
      if (typeof parameters !== 'object' || parameters === null) {
        console.warn('Invalid parameters format:', parameters)
        return {}
      }
      
      return parameters
    }
  },
  
  LimitedUser: {
    async role(parent) {
      return await getUserRole(parent.id)
    }
  },

  Mutation: {
    async userUpdate(_parent, args, context) {
      await throwForNotHavingServerRole(context, Roles.Server.Guest)
      await updateUserAndNotify(context.userId, args.user)
      return true
    },

    async userRoleChange(_parent, args) {
      const { guestModeEnabled } = await getServerInfo()
      await changeUserRole({
        role: args.userRoleInput.role,
        userId: args.userRoleInput.id,
        guestModeEnabled
      })
      return true
    },

    async adminDeleteUser(_parent, args, context) {
      await throwForNotHavingServerRole(context, Roles.Server.Admin)
      const user = await getUserByEmail({ email: args.userConfirmation.email })
      if (!user) return false

      await deleteUser({
        deleteAllUserInvites: deleteAllUserInvitesFactory({ db })
      })(user.id)
      return true
    },

    async userDelete(parent, args, context) {
      const user = await getUser(context.userId)

      if (args.userConfirmation.email !== user.email) {
        throw new BadRequestError('Malformed input: emails do not match.')
      }

      await throwForNotHavingServerRole(context, Roles.Server.Guest)
      await validateScopes(context.scopes, Scopes.Profile.Delete)

      await deleteUser({
        deleteAllUserInvites: deleteAllUserInvitesFactory({ db })
      })(context.userId, args.user)

      await saveActivityFactory({ db })({
        streamId: null,
        resourceType: 'user',
        resourceId: context.userId,
        actionType: ActionTypes.User.Delete,
        userId: context.userId,
        info: {},
        message: 'User deleted'
      })

      return true
    },

    async userSettingsUpdate(_parent, { settings }, context) {
      const userId = context.userId;
      if (!userId) throw new Error('User not authenticated');

      await updateUserSettings(userId, settings);
      return true;
    },

    async userParametersUpdate(_parent, { parameters }, context) {
      const userId = context.userId;
      if (!userId) throw new Error('User not authenticated');

      try {
        console.log('Updating user parameters:', { userId });
        
        // Get current user
        const currentUser = await getUser(userId);
        if (!currentUser) throw new Error('User not found');

        // Ensure parameters is an object
        if (typeof parameters !== 'object' || parameters === null) {
          throw new Error('Invalid parameters format');
        }

        // Validate and normalize parameters
        const normalizedParameters = Object.entries(parameters).reduce((acc, [id, param]) => {
          // Basic validation
          if (!id.startsWith('param_')) {
            throw new Error(`Invalid parameter ID: ${id}`);
          }
          if (!param || typeof param !== 'object') {
            throw new Error(`Invalid parameter format for ID: ${id}`);
          }

          // Required fields from UserParameter type
          const requiredFields = ['name', 'type', 'group'];
          const missingFields = requiredFields.filter(field => !(field in param));
          if (missingFields.length > 0) {
            throw new Error(`Missing required fields for parameter ${id}: ${missingFields.join(', ')}`);
          }

          // Validate type
          if (!['fixed', 'equation'].includes(param.type)) {
            throw new Error(`Invalid parameter type for ${id}: ${param.type}`);
          }

          // Validate equation field for equation type
          if (param.type === 'equation' && !param.equation) {
            throw new Error(`Missing equation for equation parameter: ${id}`);
          }

          // Get existing parameter if available
          const existingParam = currentUser.parameters?.[id];

          // Normalize parameter with defaults
          acc[id] = {
            ...(existingParam || {}), // Keep existing data
            ...param, // Override with new data
            // Ensure required fields with defaults
            id,
            kind: 'user',
            name: param.name,
            type: param.type,
            value: param.value ?? '',
            group: param.group,
            visible: param.visible ?? true,
            field: param.field || param.name.toLowerCase().replace(/\s+/g, '_'),
            header: param.header || param.name,
            removable: param.removable ?? true,
            metadata: {
              ...(existingParam?.metadata || {}),
              ...(param.metadata || {})
            }
          };

          return acc;
        }, {});

        // Update user with normalized parameters
        const updatedUser = await updateUser(userId, { parameters: normalizedParameters }, { skipClean: true });

        // Get existing parameters
        const existingParameters = currentUser.parameters || {};

        // Merge with existing parameters, preserving metadata
        const mergedParameters = Object.entries(parameters).reduce((acc, [id, param]) => {
          const existing = existingParameters[id];
          acc[id] = {
            ...existing, // Keep existing metadata
            ...param, // Override with new values
            kind: 'user', // Always force user kind
            metadata: {
              ...(existing?.metadata || {}),
              ...(param.metadata || {})
            }
          };
          return acc;
        }, {});

        // Update user with validated parameters
        if (!updatedUser) throw new Error('Failed to update user parameters');
        
        console.log('Successfully updated user parameters:', { 
          userId,
          parameterCount: Object.keys(mergedParameters).length
        });
        return true;
      } catch (error) {
        console.error('Error updating user parameters:', {
          userId,
          error: error.message,
          stack: error.stack,
          parameters
        });
        throw error;
      }
    },

    async userTablesUpdate(_parent, { input }, context) {
      const userId = context.userId;
      if (!userId) throw new Error('User not authenticated');

      try {
         
        console.log('GraphQL Resolver - Raw Input:', {
          userId,
          hasInput: !!input,
          hasTables: !!input?.tables,
          tablesLength: input?.tables?.length || 0,
          rawInput: JSON.stringify(input, null, 2)
        });

        // Log the schema info
        console.log('GraphQL Schema Info:', {
          mutation: 'userTablesUpdate',
          expectedInput: 'TableSettingsMapInput',
          actualInput: input ? Object.keys(input) : []
        });

        // Convert input array to map
        const tablesMap = input?.tables?.reduce((acc, entry) => {
          if (!entry || !entry.id || !entry.settings) {
            console.warn('Invalid table entry:', entry);
            return acc;
          }

          // Merge settings with ID to match database structure
          acc[entry.id] = {
            id: entry.id,
            ...entry.settings
          };
          return acc;
        }, {}) || {};

        // Log the transformed data
        console.log('GraphQL Resolver - Transformed Data:', {
          userId,
          tableCount: Object.keys(tablesMap).length,
          tableIds: Object.keys(tablesMap),
          firstTablePreview: Object.values(tablesMap)[0] ? {
            id: Object.values(tablesMap)[0].id,
            name: Object.values(tablesMap)[0].name,
            columnsCount: {
              parent: Object.values(tablesMap)[0].parentColumns?.length || 0,
              child: Object.values(tablesMap)[0].childColumns?.length || 0
            }
          } : null
        });

        // GraphQL schema validation ensures the structure is valid,
        // so we can skip the manual validation here

        const success = await updateTables(userId, tablesMap);
        if (!success) {
          console.error('Failed to update tables - updateTables returned false');
          throw new Error('Failed to update tables');
        }

        // Log success
        console.log('Tables updated successfully:', {
          userId,
          tableCount: Object.keys(tablesMap).length
        });

        return true;
      } catch (err) {
        console.error('Error updating tables:', {
          error: err,
          message: err.message,
          stack: err.stack,
          data: {
            userId,
            tableCount: input?.tables?.length || 0
          }
        });
        throw new Error('Failed to update tables: ' + err.message);
      }
    },

    activeUserMutations: () => ({}) // Empty function to prevent errors
  },

  ActiveUserMutations: {
    async finishOnboarding(_parent, _args, ctx) {
      return await markOnboardingComplete(ctx.userId || '')
    },
    async update(_parent, args, context) {
      const newUser = await updateUserAndNotify(context.userId, args.user)
      return newUser
    }
  }
}

module.exports = resolvers
