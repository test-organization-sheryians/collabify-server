import { getAuth } from "@hono/clerk-auth";
import { Context } from "hono";
import { createUserLoaders } from "../modules/user";
import { createWorkspaceLoaders } from "../modules/workspace";
import { createNotificationLoaders } from "../modules/notification/dataloaders";
import { createProjectLoaders } from "../modules/project";
import { ApplicationContext } from "./types";
import { db } from "@/infra/db";
import { redis } from "@/infra/redis";

export const createContext = (c: Context): ApplicationContext => {
  const auth = getAuth(c);

  return {
    c, // Hono context
    auth: {
      userId: auth?.userId || null,
      sessionId: auth?.sessionId || null,
    },
    db,
    redis,
    dataloaders: {
      user: createUserLoaders(),
      workspace: createWorkspaceLoaders(),
      notification: createNotificationLoaders(),
      project: createProjectLoaders(),
    },
  };
};
