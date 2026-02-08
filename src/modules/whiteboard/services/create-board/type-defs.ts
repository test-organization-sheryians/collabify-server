export const typeDefs = /* GraphQL */ `
  input CreateBoardInput {
    workspaceId: ID!
    projectId: ID
    title: String!
    description: String
    """
    Optional: Add workspace members as collaborators during board creation
    """
    collaboratorIds: [ID!]
  }

  type BoardPayload {
    board: Whiteboard!
    """
    Collaborators that were successfully added (may be fewer than requested if some failed validation)
    """
    addedCollaborators: [BoardCollaborator!]!
  }

  extend type Mutation {
    createBoard(input: CreateBoardInput!): BoardPayload!
  }
`;
