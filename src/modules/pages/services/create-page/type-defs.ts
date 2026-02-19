export const typeDefs = /* GraphQL */ `
  extend type Mutation {
    """
    Creates a new page in a project. Initialises Y.Doc and uploads initial snapshot to S3.
    The calling user is automatically added as an EDITOR collaborator.
    """
    createPage(input: CreatePageInput!): CreatePageResult!
  }

  input CreatePageInput {
    workspaceId: ID!
    projectId: ID!
    """
    null = root-level page
    """
    parentId: ID
    title: String
    icon: String
    coverUrl: String
    """
    Fractional index position for sibling ordering
    """
    position: Float!
    collaboratorIds: [ID!]
  }

  type CreatePageResult {
    page: Page!
  }
`;
