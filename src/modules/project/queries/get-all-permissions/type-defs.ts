export const getAllPermissionsTypeDefs = `
  type Permission {
    id: ID!
    resource: String!
    action: String!
    description: String
    module: String!
  }

  extend type Query {
    allPermissions(workspaceId: ID!): [Permission!]!
  }
`;
