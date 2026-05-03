import type { ServiceContext } from "@/graphql/types";
import {
  getNotifications,
  GetNotificationsSchema,
} from "../queries/get-notifications";
import {
  getUnreadCount,
  GetUnreadCountSchema,
} from "../queries/get-unread-count";
import {
  markNotificationRead,
  MarkNotificationReadSchema,
} from "../services/mark-notification-read";
import {
  markAllNotificationsRead,
  MarkAllNotificationsReadSchema,
} from "../services/mark-all-notifications-read";

// =============================================================================
// Notification Management — GraphQL Resolvers
//
// Pruned: Preference-related resolvers moved to domain modules (User, Workspace, Project, Chat).
// Handles: Notification list, unread count, and read status management.
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ctx = ServiceContext;

export const notificationManagementResolvers = {
  Query: {
    notifications: async (
      _: unknown,
      args: {
        limit?: number | null;
        cursor?: string | null;
        isRead?: boolean | null;
      },
      ctx: Ctx
    ) => {
      const { userId } = ctx.auth;
      if (!userId) throw new Error("Unauthorized");

      const result = await getNotifications(
        GetNotificationsSchema.parse({
          userId,
          limit: args.limit ?? 20,
          cursor: args.cursor ?? undefined,
          filter: { isRead: args.isRead ?? undefined },
        })
      );

      return {
        edges: result.items.map((node) => ({ cursor: node.id, node })),
        pageInfo: result.pageInfo,
      };
    },

    unreadNotificationCount: async (_: unknown, __: unknown, ctx: Ctx) => {
      const { userId } = ctx.auth;
      if (!userId) throw new Error("Unauthorized");
      return getUnreadCount(GetUnreadCountSchema.parse({ userId }));
    },
  },

  Mutation: {
    markNotificationRead: async (
      _: unknown,
      args: { ids: string[] },
      ctx: Ctx
    ) => {
      const { userId } = ctx.auth;
      if (!userId) throw new Error("Unauthorized");
      await markNotificationRead(
        MarkNotificationReadSchema.parse({ ids: args.ids, actorUserId: userId })
      );
      return true;
    },

    markAllNotificationsRead: async (_: unknown, __: unknown, ctx: Ctx) => {
      const { userId } = ctx.auth;
      if (!userId) throw new Error("Unauthorized");
      await markAllNotificationsRead(
        MarkAllNotificationsReadSchema.parse({ actorUserId: userId })
      );
      return true;
    },
  },

  // ── Field Resolvers ─────────────────────────────────────────────────────
  Notification: {
    actor: (parent: { actorId?: string | null }, _: unknown, ctx: Ctx) => {
      if (!parent.actorId) return null;
      return ctx.dataloaders.notification.actorById.load(parent.actorId);
    },
    workspace: (
      parent: { workspaceId?: string | null },
      _: unknown,
      ctx: Ctx
    ) => {
      if (!parent.workspaceId) return null;
      return ctx.dataloaders.notification.workspaceById.load(
        parent.workspaceId
      );
    },
    project: (parent: { projectId?: string | null }, _: unknown, ctx: Ctx) => {
      if (!parent.projectId) return null;
      return ctx.dataloaders.notification.projectById.load(parent.projectId);
    },
  },
};
