export const typeDefs = /* GraphQL */ `
  extend type Query {
    """
    DB collaborator list (authoritative). For real-time presence, use getActivePageCollaborators.
    """
    getPageCollaborators(pageId: ID!): [PageCollaborator!]!
  }
`;
