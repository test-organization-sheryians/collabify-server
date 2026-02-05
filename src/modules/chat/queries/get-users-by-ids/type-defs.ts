export const typeDefs = /* GraphQL */ `
  extend type Query {
    getUsersByIds(userIds: [ID!]!): [UserBasic!]!
  }
`;
