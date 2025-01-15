const expect = require('chai').expect
const { beforeEach, describe, it } = require('mocha')

const { createUser } = require('./helpers')
const { buildAuthenticatedApolloServer } = require('./serverHelper')
const { gql } = require('graphql-tag')

describe('Parameters', () => {
  let server
  let userA

  beforeEach(async () => {
    // Create test user
    userA = await createUser('test-user@parameters.com', 'password')
    const res = await buildAuthenticatedApolloServer(userA.id)
    server = res.server
  })

  describe('Authentication', () => {
    it('should require authentication for queries', async () => {
      const query = gql`
        query {
          parameters {
            ... on BimParameter {
              id
              name
            }
          }
        }
      `

      const res = await server.executeOperation({
        query,
        context: { userId: null }
      })

      expect(res.errors).to.have.length(1)
      expect(res.errors[0].message).to.equal('User not authenticated')
    })

    it('should require authentication for mutations', async () => {
      const mutation = gql`
        mutation CreateBimParameter($input: CreateBimParameterInput!) {
          createBimParameter(input: $input) {
            parameter {
              ... on BimParameter {
                id
              }
            }
          }
        }
      `

      const input = {
        name: 'Width',
        type: 'number',
        sourceValue: '100',
        group: {fetchedGroup: 'Dimensions',
        currentGroup: 'Dimensions'},
        field: 'width',
        visible: true,
        header: 'Width',
        removable: true,
        value: '100'
      }

      const res = await server.executeOperation({
        query: mutation,
        variables: { input },
        context: { userId: null }
      })

      expect(res.errors).to.have.length(1)
      expect(res.errors[0].message).to.equal('User not authenticated')
    })
  })

  describe('Queries', () => {
    it('should get empty parameters list for new user', async () => {
      const query = gql`
        query {
          parameters {
            ... on BimParameter {
              id
              kind
              name
              type
              sourceValue
              group
              value
            }
            ... on UserParameter {
              id
              kind
              name
              type
              group
              equation
              value
            }
          }
        }
      `

      const res = await server.executeOperation({
        query,
        context: { userId: userA.id }
      })

      expect(res.errors).to.be.undefined
      expect(res.data.parameters).to.be.an('array').that.is.empty
    })
  })

  describe('Mutations', () => {
    describe('BIM Parameters', () => {
      it('should create BIM parameter', async () => {
        const mutation = gql`
          mutation CreateBimParameter($input: CreateBimParameterInput!) {
            createBimParameter(input: $input) {
              parameter {
                ... on BimParameter {
                  id
                  kind
                  name
                  type
                  sourceValue
                  group
                  value
                }
              }
            }
          }
        `

        const input = {
          name: 'Width',
          type: 'number',
          sourceValue: '100',
          group: {
            fetchedGroup: 'Dimensions',
            currentGroup: 'Dimensions'
          },
          field: 'width',
          visible: true,
          header: 'Width',
          removable: true,
          value: '100'
        }

        const res = await server.executeOperation({
          query: mutation,
          variables: { input },
          context: { userId: userA.id }
        })

        expect(res.errors).to.be.undefined
        expect(res.data.createBimParameter.parameter).to.include({
          kind: 'bim',
          name: 'Width',
          type: 'number',
          sourceValue: '100',
          group: {
            fetchedGroup: 'Dimensions',
            currentGroup: 'Dimensions'
        },
          value: '100'
        })
      })

      it('should prevent duplicate BIM parameter names in same group', async () => {
        const mutation = gql`
          mutation CreateBimParameter($input: CreateBimParameterInput!) {
            createBimParameter(input: $input) {
              parameter {
                ... on BimParameter {
                  id
                }
              }
            }
          }
        `

        const input = {
          name: 'Width',
          type: 'number',
          sourceValue: '100',
          group: {
            fetchedGroup: 'Dimensions',
            currentGroup: 'Dimensions'
          },
          field: 'width',
          visible: true,
          header: 'Width',
          removable: true,
          value: '100'
        }

        // Create first parameter
        await server.executeOperation({
          query: mutation,
          variables: { input },
          context: { userId: userA.id }
        })

        // Try to create duplicate
        const res = await server.executeOperation({
          query: mutation,
          variables: { input },
          context: { userId: userA.id }
        })

        expect(res.errors).to.have.length(1)
        expect(res.errors[0].message).to.equal(
          'A BIM parameter with this name already exists in this group'
        )
      })

      it('should update BIM parameter', async () => {
        // First create a parameter
        const createMutation = gql`
          mutation CreateBimParameter($input: CreateBimParameterInput!) {
            createBimParameter(input: $input) {
              parameter {
                ... on BimParameter {
                  id
                  kind
                  name
                  type
                  sourceValue
                  group
                  value
                }
              }
            }
          }
        `

        const createInput = {
          name: 'Width',
          type: 'number',
          sourceValue: '100',
          group: { 
            fetchedGroup: 'Dimensions',
            currentGroup: 'Dimensions'
          },
          field: 'width',
          visible: true,
          header: 'Width',
          removable: true,
          value: '100'
        }

        const createRes = await server.executeOperation({
          query: createMutation,
          variables: { input: createInput },
          context: { userId: userA.id }
        })

        const paramId = createRes.data.createBimParameter.parameter.id

        // Then update it
        const updateMutation = gql`
          mutation UpdateBimParameter($id: ID!, $input: UpdateBimParameterInput!) {
            updateBimParameter(id: $id, input: $input) {
              parameter {
                ... on BimParameter {
                  id
                  kind
                  name
                  type
                  sourceValue
                  g
                  value
                }
              }
            }
          }
        `

        const updateInput = {
          currentGroup: 'New Group',
          value: '200'
        }

        const updateRes = await server.executeOperation({
          query: updateMutation,
          variables: { id: paramId, input: updateInput },
          context: { userId: userA.id }
        })

        expect(updateRes.errors).to.be.undefined
        expect(updateRes.data.updateBimParameter.parameter).to.include({
          id: paramId,
          kind: 'bim',
          name: 'Width',
          currentGroup: 'New Group',
          value: '200'
        })
      })

      it('should prevent updating non-existent parameter', async () => {
        const mutation = gql`
          mutation UpdateBimParameter($id: ID!, $input: UpdateBimParameterInput!) {
            updateBimParameter(id: $id, input: $input) {
              parameter {
                ... on BimParameter {
                  id
                }
              }
            }
          }
        `

        const res = await server.executeOperation({
          query: mutation,
          variables: {
            id: 'non-existent',
            input: { value: '200' }
          },
          context: { userId: userA.id }
        })

        expect(res.errors).to.have.length(1)
        expect(res.errors[0].message).to.equal('BIM parameter not found')
      })
    })

    describe('User Parameters', () => {
      it('should create user parameter', async () => {
        const mutation = gql`
          mutation CreateUserParameter($input: CreateUserParameterInput!) {
            createUserParameter(input: $input) {
              parameter {
                ... on UserParameter {
                  id
                  kind
                  name
                  type
                  group
                  equation
                  value
                }
              }
            }
          }
        `

        const input = {
          name: 'Custom Width',
          type: 'fixed',
          group: { 
            fetchedGroup: '', 
            currentGroup: 'Custom' 
          },
          field: 'customWidth',
          visible: true,
          header: 'Custom Width',
          removable: true,
          value: '150'
        }

        const res = await server.executeOperation({
          query: mutation,
          variables: { input },
          context: { userId: userA.id }
        })

        expect(res.errors).to.be.undefined
        expect(res.data.createUserParameter.parameter).to.include({
          kind: 'user',
          name: 'Custom Width',
          type: 'fixed',
          group: { 
            fetchedGroup: '', 
            currentGroup: 'Custom' 
          },
          value: '150'
        })
      })

      it('should prevent duplicate user parameter names in same group', async () => {
        const mutation = gql`
          mutation CreateUserParameter($input: CreateUserParameterInput!) {
            createUserParameter(input: $input) {
              parameter {
                ... on UserParameter {
                  id
                }
              }
            }
          }
        `

        const input = {
          name: 'Custom Width',
          type: 'fixed',
          group: { 
            fetchedGroup: '', 
            currentGroup: 'Custom' 
          },
          field: 'customWidth',
          visible: true,
          header: 'Custom Width',
          removable: true,
          value: '150'
        }

        // Create first parameter
        await server.executeOperation({
          query: mutation,
          variables: { input },
          context: { userId: userA.id }
        })

        // Try to create duplicate
        const res = await server.executeOperation({
          query: mutation,
          variables: { input },
          context: { userId: userA.id }
        })

        expect(res.errors).to.have.length(1)
        expect(res.errors[0].message).to.equal(
          'A user parameter with this name already exists in this group'
        )
      })

      it('should create equation parameter', async () => {
        const mutation = gql`
          mutation CreateUserParameter($input: CreateUserParameterInput!) {
            createUserParameter(input: $input) {
              parameter {
                ... on UserParameter {
                  id
                  kind
                  name
                  type
                  group
                  equation
                  value
                }
              }
            }
          }
        `

        const input = {
          name: 'Double Width',
          type: 'equation',
          group: { 
            fetchedGroup: '', 
            currentGroup: 'Custom' 
          },
          equation: 'width * 2',
          field: 'doubleWidth',
          visible: true,
          header: 'Double Width',
          removable: true,
          value: '200'
        }

        const res = await server.executeOperation({
          query: mutation,
          variables: { input },
          context: { userId: userA.id }
        })

        expect(res.errors).to.be.undefined
        expect(res.data.createUserParameter.parameter).to.include({
          kind: 'user',
          name: 'Double Width',
          type: 'equation',
          group: { 
            fetchedGroup: '', 
            currentGroup: 'Custom' 
          },
          equation: 'width * 2',
          value: '200'
        })
      })
    })

    describe('Table Operations', () => {
      it('should add parameter to table', async () => {
        // First create a parameter
        const createMutation = gql`
          mutation CreateUserParameter($input: CreateUserParameterInput!) {
            createUserParameter(input: $input) {
              parameter {
                ... on UserParameter {
                  id
                }
              }
            }
          }
        `

        const createInput = {
          name: 'Custom Width',
          type: 'fixed',
          group: { 
            fetchedGroup: '', 
            currentGroup: 'Custom' 
          },
          field: 'customWidth',
          visible: true,
          header: 'Custom Width',
          removable: true,
          value: '150'
        }

        const createRes = await server.executeOperation({
          query: createMutation,
          variables: { input: createInput },
          context: { userId: userA.id }
        })

        const paramId = createRes.data.createUserParameter.parameter.id

        // Then add to table
        const addToTableMutation = gql`
          mutation AddParameterToTable($parameterId: ID!, $tableId: ID!) {
            addParameterToTable(parameterId: $parameterId, tableId: $tableId)
          }
        `

        const tableId = 'test-table'
        const addRes = await server.executeOperation({
          query: addToTableMutation,
          variables: { parameterId: paramId, tableId },
          context: { userId: userA.id }
        })

        expect(addRes.errors).to.be.undefined
        expect(addRes.data.addParameterToTable).to.be.true

        // Verify parameter is in table
        const tableQuery = gql`
          query TableParameters($tableId: ID!) {
            tableParameters(tableId: $tableId) {
              ... on UserParameter {
                id
                name
                value
              }
            }
          }
        `

        const queryRes = await server.executeOperation({
          query: tableQuery,
          variables: { tableId },
          context: { userId: userA.id }
        })

        expect(queryRes.errors).to.be.undefined
        expect(queryRes.data.tableParameters).to.have.lengthOf(1)
        expect(queryRes.data.tableParameters[0]).to.include({
          id: paramId,
          name: 'Custom Width',
          value: '150'
        })
      })

      it('should prevent adding non-existent parameter to table', async () => {
        const mutation = gql`
          mutation AddParameterToTable($parameterId: ID!, $tableId: ID!) {
            addParameterToTable(parameterId: $parameterId, tableId: $tableId)
          }
        `

        const res = await server.executeOperation({
          query: mutation,
          variables: {
            parameterId: 'non-existent',
            tableId: 'test-table'
          },
          context: { userId: userA.id }
        })

        expect(res.errors).to.have.length(1)
        expect(res.errors[0].message).to.equal('Parameter not found')
      })

      it('should remove parameter from table', async () => {
        // First create and add parameter
        const createMutation = gql`
          mutation CreateUserParameter($input: CreateUserParameterInput!) {
            createUserParameter(input: $input) {
              parameter {
                ... on UserParameter {
                  id
                }
              }
            }
          }
        `

        const createInput = {
          name: 'Custom Width',
          type: 'fixed',
          group: { 
            fetchedGroup: '', 
            currentGroup: 'Custom' 
          },
          field: 'customWidth',
          visible: true,
          header: 'Custom Width',
          removable: true,
          value: '150'
        }

        const createRes = await server.executeOperation({
          query: createMutation,
          variables: { input: createInput },
          context: { userId: userA.id }
        })

        const paramId = createRes.data.createUserParameter.parameter.id
        const tableId = 'test-table'

        // Add to table
        const addMutation = gql`
          mutation AddParameterToTable($parameterId: ID!, $tableId: ID!) {
            addParameterToTable(parameterId: $parameterId, tableId: $tableId)
          }
        `

        await server.executeOperation({
          query: addMutation,
          variables: { parameterId: paramId, tableId },
          context: { userId: userA.id }
        })

        // Then remove from table
        const removeMutation = gql`
          mutation RemoveParameterFromTable($parameterId: ID!, $tableId: ID!) {
            removeParameterFromTable(parameterId: $parameterId, tableId: $tableId)
          }
        `

        const removeRes = await server.executeOperation({
          query: removeMutation,
          variables: { parameterId: paramId, tableId },
          context: { userId: userA.id }
        })

        expect(removeRes.errors).to.be.undefined
        expect(removeRes.data.removeParameterFromTable).to.be.true

        // Verify parameter is removed
        const tableQuery = gql`
          query TableParameters($tableId: ID!) {
            tableParameters(tableId: $tableId) {
              ... on UserParameter {
                id
              }
            }
          }
        `

        const queryRes = await server.executeOperation({
          query: tableQuery,
          variables: { tableId },
          context: { userId: userA.id }
        })

        expect(queryRes.errors).to.be.undefined
        expect(queryRes.data.tableParameters).to.be.empty
      })
    })
  })
})
