import { ServiceContext } from "@/graphql/types";
import { Notification } from "@prisma/client";
import { InboxService } from "./service";
import { NotificationData } from "./types";

type NotificationParent = Notification & { data: NotificationData };

export const resolvers = {
  Query: {
    notifications: async (
      _: unknown,
      args: { limit?: number; cursor?: string; isRead?: boolean },
      ctx: ServiceContext
    ) => {
      const { userId } = ctx.auth;
      if (!userId) throw new Error("Unauthorized");

      const result = await InboxService.getNotifications(
        userId,
        args.limit,
        args.cursor,
        { isRead: args.isRead }
      );

      return {
        edges: result.items.map((node) => ({
          cursor: node.id, // Using ID as cursor for simple pagination
          node,
        })),
        pageInfo: result.pageInfo,
      };
    },

    unreadNotificationCount: async (
      _: unknown,
      __: unknown,
      ctx: ServiceContext
    ) => {
      const { userId } = ctx.auth;
      if (!userId) throw new Error("Unauthorized");

      return await InboxService.getUnreadCount(userId);
    },
  },

  Mutation: {
    markNotificationRead: async (
      _: unknown,
      args: { ids: string[] },
      ctx: ServiceContext
    ) => {
      const { userId } = ctx.auth;
      if (!userId) throw new Error("Unauthorized");

      await InboxService.markAsRead(userId, args.ids);
      return true;
    },

    markAllNotificationsRead: async (
      _: unknown,
      __: unknown,
      ctx: ServiceContext
    ) => {
      const { userId } = ctx.auth;
      if (!userId) throw new Error("Unauthorized");

      await InboxService.markAllAsRead(userId);
      return true;
    },
  },

  Notification: {
    actor: (parent: NotificationParent, _: unknown, ctx: ServiceContext) => {
      // Logic safe now because parent is typed
      if (!parent.actorId) return null;
      return ctx.dataloaders.notification.actorById.load(parent.actorId);
    },
    page: (parent: NotificationParent, _: unknown, ctx: ServiceContext) => {
      // Polymorphic Resolution
      if (parent.entityType === "PAGE") {
        return ctx.dataloaders.notification.pageById.load(parent.entityId);
      }
      return null;
    },
    task: (parent: NotificationParent, _: unknown, ctx: ServiceContext) => {
      if (parent.entityType === "TASK") {
        return ctx.dataloaders.notification.taskById.load(parent.entityId);
      }
      return null;
    },
    chatMessage: (
      parent: NotificationParent,
      _: unknown,
      ctx: ServiceContext
    ) => {
      if (parent.entityType === "CHAT_MESSAGE") {
        return ctx.dataloaders.notification.chatMessageById.load(
          parent.entityId
        );
      }
      return null;
    },
    workspace: (
      parent: NotificationParent,
      _: unknown,
      ctx: ServiceContext
    ) => {
      if (!parent.workspaceId) return null;
      return ctx.dataloaders.notification.workspaceById.load(
        parent.workspaceId
      );
    },
    project: (parent: NotificationParent, _: unknown, ctx: ServiceContext) => {
      if (!parent.projectId) return null;
      return ctx.dataloaders.notification.projectById.load(parent.projectId);
    },
  },
};
