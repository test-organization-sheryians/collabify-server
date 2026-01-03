import { getAuth } from "@hono/clerk-auth";
import { Context } from "hono";
import { createUserLoaders, UserLoaders } from "../modules/user/dataloaders";
import { createWorkspaceLoaders, WorkspaceLoaders } from "../modules/workspace/dataloaders";


export interface GraphQLContext {
  auth: {
    userId: string | null;
    sessionId: string | null;
  };
  dataloaders: {
    user: UserLoaders;
    workspace: WorkspaceLoaders;
  };
}

export const createContext = (c: Context): GraphQLContext => {
  const auth = getAuth(c);

  return {
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
