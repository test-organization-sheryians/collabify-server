import { getAuth } from "@hono/clerk-auth";
import { Context } from "hono";
import { createUserLoaders } from "../modules/user/dataloaders";
import { createWorkspaceLoaders } from "../modules/workspace/dataloaders";
import { ApplicationContext } from "./types";

export const createContext = (c: Context): ApplicationContext => {
  const auth = getAuth(c);

  return {
    c, // Hono context
    auth: {
      userId: auth?.userId || null,
      sessionId: auth?.sessionId || null,
    },
    dataloaders: {
      user: createUserLoaders(),
      workspace: createWorkspaceLoaders(),
    },
  };
};
