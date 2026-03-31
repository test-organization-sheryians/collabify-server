export const inviteToWorkspaceTypeDefs = `
  input InviteToWorkspaceInput {
    workspaceId: ID!
    emails: [String!]!
    roleId: ID!
  }

  type InviteResponse {
    success: Boolean!
    message: String!
    invitedCount: Int!
  }

  extend type Mutation {
    inviteToWorkspace(input: InviteToWorkspaceInput!): InviteResponse!
  }
`;
