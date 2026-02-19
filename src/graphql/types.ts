import { ProjectLoaders } from "./../modules/project";
import { Context as HonoContext } from "hono";
import { UserLoaders } from "../modules/user";
import { WorkspaceLoaders } from "../modules/workspace";
import { NotificationLoaders } from "../modules/notification/dataloaders";
import { ChatLoaders } from "../modules/chat/loaders";
import { WhiteboardLoaders } from "../modules/whiteboard/loaders";
import { PageLoaders } from "../modules/pages/loaders";
import { YogaInitialContext } from "graphql-yoga";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { S3Client } from "@aws-sdk/client-s3";

export interface ApplicationContext {
  c: HonoContext;
  auth: {
    userId: string | null;
    sessionId: string | null;
  };
  db: PrismaClient;
  redis: Redis;
  s3: S3Client;
  dataloaders: {
    user: UserLoaders;
    workspace: WorkspaceLoaders;
    notification: NotificationLoaders;
    project: ProjectLoaders;
    chat: ChatLoaders;
    whiteboard: WhiteboardLoaders;
    page: PageLoaders;
  };
}

export interface ServiceContext
  extends ApplicationContext, YogaInitialContext {}
