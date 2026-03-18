import { getAuth } from "@hono/clerk-auth";
import { Context } from "hono";
import { createUserLoaders } from "../modules/user";
import { createWorkspaceLoaders } from "../modules/workspace";
import { createNotificationLoaders } from "../modules/notification/dataloaders";
import { createProjectLoaders } from "../modules/project";
import { createChatLoaders } from "../modules/chat";
import { createWhiteboardLoaders } from "../modules/whiteboard/loaders";
import { createPageLoaders } from "../modules/pages/loaders";
import { ApplicationContext } from "./types";
import { db } from "@/infra/db";
import { redis } from "@/infra/redis";
import { s3Client } from "@/infra/aws/s3";
import { createGraphQLAuthContext } from "../modules/authorization";

export const createContext = (c: Context): ApplicationContext => {
  const auth = getAuth(c);
  const userId = auth?.userId || null;

  // Create per-request auth instances (null when unauthenticated)
  const authContext = userId
    ? createGraphQLAuthContext(userId, db, redis)
    : null;

  const ctx: ApplicationContext = {
    c, // Hono context
    auth: {
      userId,
      sessionId: auth?.sessionId || null,
    },
    authGate: authContext?.auth ?? null,
    permissions: authContext?.permissions ?? null,
    db,
    redis,
    s3: s3Client,
    dataloaders: {} as ApplicationContext["dataloaders"],
  };

  // Initialize dataloaders with context
  ctx.dataloaders = {
    user: createUserLoaders(),
    workspace: createWorkspaceLoaders(),
    notification: createNotificationLoaders(),
    project: createProjectLoaders(),
    chat: createChatLoaders(ctx),
    whiteboard: createWhiteboardLoaders(),
    page: createPageLoaders(),
  };

  return ctx;
};
