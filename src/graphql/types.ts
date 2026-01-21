import { ProjectLoaders } from "./../modules/project";
import { Context as HonoContext } from "hono";
import { UserLoaders } from "../modules/user";
import { WorkspaceLoaders } from "../modules/workspace";
import { NotificationLoaders } from "../modules/notification/dataloaders";
import { ChatLoaders } from "../modules/chat";
import { YogaInitialContext } from "graphql-yoga";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";

export interface ApplicationContext {
  c: HonoContext;
  auth: {
    userId: string | null;
    sessionId: string | null;
  };
  db: PrismaClient;
  redis: Redis;
  dataloaders: {
    user: UserLoaders;
    workspace: WorkspaceLoaders;
    notification: NotificationLoaders;
    project: ProjectLoaders;
    chat: ChatLoaders;
  };
}

export interface ServiceContext
  extends ApplicationContext, YogaInitialContext {}
