export const declineWorkspaceInviteTypeDefs = `
  input DeclineWorkspaceInviteInput {
    token: String!
  }

  type DeclineResponse {
    success: Boolean!
    message: String!
  }

  extend type Mutation {
    declineWorkspaceInvite(input: DeclineWorkspaceInviteInput!): DeclineResponse!
  }
`;
