export const toggleProjectPluginTypeDefs = /* GraphQL */ `
  extend type Mutation {
    toggleProjectPlugin(
      projectId: ID!
      workspaceId: ID!
      type: String!
      enable: Boolean!
    ): Boolean!
  }
`
