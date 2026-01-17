import { createSchema } from "graphql-yoga";
import { userTypeDefs } from "../modules/user/schema";
import { userResolvers } from "../modules/user/resolvers";
import { typeDefs as workspaceTypeDefs } from "../modules/workspace/schema";
import { resolvers as workspaceResolvers } from "../modules/workspace/resolvers";
import { typeDefs as notificationTypeDefs } from "../modules/notification/schema";
import { resolvers as notificationResolvers } from "../modules/notification/resolvers";
import { typeDefs as projectTypeDefs } from "../modules/project/schema";
import { resolvers as projectResolvers } from "../modules/project/resolvers";

import { ServiceContext } from "./types";

export const schema = createSchema<ServiceContext>({
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
    notificationTypeDefs,
    projectTypeDefs,
  ],
  resolvers: [
    {
      Query: {
        health: () => "OK",
      },
    },
    userResolvers,
    workspaceResolvers,
    notificationResolvers,
    projectResolvers,
  ],
});
