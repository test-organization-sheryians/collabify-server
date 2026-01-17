export const acceptInviteTypeDefs = `
  input AcceptInviteInput {
    token: String!
    userId: String
    userEmail: String
  }

  type JoinResponse {
    success: Boolean!
    message: String!
    workspaceSlug: String!
  }

  extend type Mutation {
    acceptWorkspaceInvite(input: AcceptInviteInput!): JoinResponse!
  }
`;
