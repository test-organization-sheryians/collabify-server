export const typeDefs = /* GraphQL */ `
  extend type Query {
    getPresenceMap(userIds: [ID!]!): [UserPresence!]!
  }
`;
