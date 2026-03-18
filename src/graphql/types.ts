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
import type { AuthGate } from "../modules/authorization/auth-gate/auth-gate";
import type { PermissionEngine } from "../modules/authorization/engine/permission-engine";

export interface ApplicationContext {
  c: HonoContext;
  /** Raw Clerk auth identifiers — preserved for backward compatibility */
  auth: {
    userId: string | null;
    sessionId: string | null;
  };
  /** Cache-backed authorization gate — use for membership and identity checks */
  authGate: AuthGate | null;
  /** RBAC permission engine — use for permission assertion */
  permissions: PermissionEngine | null;
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
