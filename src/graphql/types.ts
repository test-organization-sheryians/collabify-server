import { Context as HonoContext } from "hono";
import { UserLoaders } from "../modules/user/dataloaders";
import { WorkspaceLoaders } from "../modules/workspace/dataloaders";
import { YogaInitialContext } from "graphql-yoga";

export interface ApplicationContext {
  c: HonoContext;
  auth: {
    userId: string | null;
    sessionId: string | null;
  };
  dataloaders: {
    user: UserLoaders;
    workspace: WorkspaceLoaders;
  };
}

export interface ServiceContext
  extends ApplicationContext, YogaInitialContext {}
