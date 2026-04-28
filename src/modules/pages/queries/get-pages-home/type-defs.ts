export const typeDefs = /* GraphQL */ `
  type PageHomeItem {
    id:            ID!
    title:         String!
    emojiIcon:     String
    updatedAt:     String!
    createdByName: String
  }

  type PagesHomeResult {
    pages: [PageHomeItem!]!
  }

  extend type Query {
    getPagesHome(limit: Int): PagesHomeResult!
  }
`;
