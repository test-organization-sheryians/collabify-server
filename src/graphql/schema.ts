import { createSchema } from "graphql-yoga";
import { DateTimeResolver, JSONResolver } from "graphql-scalars";
import { userTypeDefs, userResolvers } from "../modules/user";
import { workspaceTypeDefs } from "../modules/workspace";
import { workspaceResolvers } from "../modules/workspace";
import {
  typeDefs as notificationTypeDefs,
  resolvers as notificationResolvers,
} from "../modules/notification";
import { projectTypeDefs, projectResolvers } from "../modules/project";
import {
  chatTypeDefs,
  chatResolvers,
} from "../modules/chat";
import {
  whiteboardTypeDefs,
  whiteboardResolvers,
} from "../modules/whiteboard";
import {
  pageTypeDefs,
  pageResolvers,
} from "../modules/pages";
import {
  vaultTypeDefs,
  vaultResolvers,
} from "../modules/vault";
import {
  issuesTypeDefs,
  issuesResolvers,
} from "../modules/issues";
import {
  authorizationTypeDefs,
  authorizationResolvers,
} from "../modules/authorization";
import { mentionTypeDefs, mentionResolvers } from "../modules/mention";

import { ServiceContext } from "./types";
export const schema = createSchema<ServiceContext>({
  typeDefs: [
    /* GraphQL */ `
      scalar DateTime
      scalar JSON

      type PageInfo {
        hasNextPage: Boolean!
        endCursor: String
      }

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
    chatTypeDefs,
    ...whiteboardTypeDefs,
    ...pageTypeDefs,
    ...vaultTypeDefs,
    ...issuesTypeDefs,
    authorizationTypeDefs,
    mentionTypeDefs,
  ],
  resolvers: [
    {
      Query: {
        health: () => "OK",
      },
      DateTime: DateTimeResolver,
      JSON: JSONResolver,
    },
    userResolvers,
    workspaceResolvers,
    notificationResolvers,
    projectResolvers,
    chatResolvers,
    whiteboardResolvers,
    pageResolvers,
    vaultResolvers,
    issuesResolvers,
    authorizationResolvers,
    mentionResolvers,
  ],
});
