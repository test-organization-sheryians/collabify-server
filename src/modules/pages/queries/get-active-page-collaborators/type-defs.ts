export const typeDefs = /* GraphQL */ `
  extend type Query {
    """
    Live presence from Redis ZSET (not DB). Reflects current editing sessions.
    """
    getActivePageCollaborators(pageId: ID!): [PageCollaborator!]!
  }
`;
