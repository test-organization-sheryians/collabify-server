export const typeDefs = /* GraphQL */ `
  extend type Query {
    getReadReceipts(messageId: ID!): ReadReceiptsResponse!
  }

  type ReadReceiptsResponse {
    readBy: [ReadReceiptUser!]!
    totalReads: Int!
    totalMembers: Int!
  }

  type ReadReceiptUser {
    userId: ID!
    username: String!
    avatarUrl: String
  }
`;
