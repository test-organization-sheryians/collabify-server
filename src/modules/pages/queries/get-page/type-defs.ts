export const typeDefs = /* GraphQL */ `
  extend type Query {
    """
    Fetch page metadata. Use getPageSnapshot for Y.Doc content.
    """
    getPage(pageId: ID!): Page!
  }
`;
