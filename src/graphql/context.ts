import { getAuth } from "@hono/clerk-auth";
import { Context } from "hono";
import { createUserLoaders } from "../modules/user";
import { createWorkspaceLoaders } from "../modules/workspace";
import { createNotificationLoaders } from "../modules/notification/dataloaders";
import { createProjectLoaders } from "../modules/project";
import { createChatLoaders } from "../modules/chat";
import { ApplicationContext } from "./types";
import { db } from "@/infra/db";
import { redis } from "@/infra/redis";

export const createContext = (c: Context): ApplicationContext => {
  const auth = getAuth(c);

  const ctx: ApplicationContext = {
    c, // Hono context
    auth: {
      userId: auth?.userId || null,
      sessionId: auth?.sessionId || null,
    },
    db,
    redis,
    dataloaders: {} as ApplicationContext["dataloaders"],
  };

  // Initialize dataloaders with context
  ctx.dataloaders = {
    user: createUserLoaders(),
    workspace: createWorkspaceLoaders(),
    notification: createNotificationLoaders(),
    project: createProjectLoaders(),
    chat: createChatLoaders(ctx),
  };

  return ctx;
};
