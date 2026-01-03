import { createSchema } from "graphql-yoga";
import { userTypeDefs } from "../modules/user/schema";
import { userResolvers } from "../modules/user/resolvers";

export const schema = createSchema({
  typeDefs: [
    /* GraphQL */ `
      type Query {
        health: String!
      }
    `,
    userTypeDefs,
  ],
  resolvers: [
    {
      Query: {
        health: () => "OK",
      },
    },
    userResolvers,
  ],
});
