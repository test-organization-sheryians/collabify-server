import { createSchema } from "graphql-yoga";
import { userTypeDefs } from "../modules/user/schema";
import { userResolvers } from "../modules/user/resolvers";
import { typeDefs as workspaceTypeDefs } from "../modules/workspace/schema";
import { resolvers as workspaceResolvers } from "../modules/workspace/resolvers";

export const schema = createSchema({
  typeDefs: [
    /* GraphQL */ `
      type Query {
        health: String!
      }
      type Mutation {
        _health: String
      }
    `,
    userTypeDefs,
    workspaceTypeDefs,
  ],
  resolvers: [
    {
      Query: {
        health: () => "OK",
      },
    },
    userResolvers,
    workspaceResolvers,
  ],
});
