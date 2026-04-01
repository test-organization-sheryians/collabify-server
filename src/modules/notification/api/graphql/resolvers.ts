import { Resolvers } from "@/graphql/generated";
import {
  getNotifications,
  GetNotificationsSchema,
  getUnreadCount,
  GetUnreadCountSchema,
} from "../../queries";
import {
  markNotificationRead,
  MarkNotificationReadSchema,
  markAllNotificationsRead,
  MarkAllNotificationsReadSchema,
} from "../../services";

export const resolvers: Resolvers = {
  Query: {
    notifications: async (_, args, ctx) => {
      const { userId } = ctx.auth;
      if (!userId) throw new Error("Unauthorized");

      const input = {
        userId,
        limit: args.limit,
        cursor: args.cursor,
        filter: { isRead: args.isRead },
      };

      const data = GetNotificationsSchema.parse(input);
      const result = await getNotifications(data, ctx);
      return {
        edges: result.items.map((node) => ({
          cursor: node.id,
          node,
        })),
        pageInfo: result.pageInfo,
      };
    },

    unreadNotificationCount: async (_, __, ctx) => {
      const { userId } = ctx.auth;
      if (!userId) throw new Error("Unauthorized");

      const data = GetUnreadCountSchema.parse({ userId });
      return getUnreadCount(data, ctx);
    },
  },

  Mutation: {
    markNotificationRead: async (_, args, ctx) => {
      const { userId } = ctx.auth;
      if (!userId) throw new Error("Unauthorized");

      const data = MarkNotificationReadSchema.parse({
        ids: args.ids,
        actorUserId: userId,
      });
      await markNotificationRead(data, ctx);
      return true;
    },

    markAllNotificationsRead: async (_, __, ctx) => {
      const { userId } = ctx.auth;
      if (!userId) throw new Error("Unauthorized");

      const data = MarkAllNotificationsReadSchema.parse({
        actorUserId: userId,
      });
      await markAllNotificationsRead(data, ctx);
      return true;
    },
  },

  Notification: {
    actor: (parent, _, ctx) => {
      if (!parent.actorId) return null;
      return ctx.dataloaders.notification.actorById.load(parent.actorId);
    },
    page: (parent, _, ctx) => {
      if (parent.entityType === "PAGE") {
        return ctx.dataloaders.notification.pageById.load(parent.entityId);
      }
      return null;
    },
    task: (parent, _, ctx) => {
      if (parent.entityType === "TASK") {
        return ctx.dataloaders.notification.issueById.load(parent.entityId);
      }
      return null;
    },
    chatMessage: (parent, _, ctx) => {
      if (parent.entityType === "CHAT_MESSAGE") {
        return ctx.dataloaders.notification.chatMessageById.load(
          parent.entityId
        );
      }
      return null;
    },
    workspace: (parent, _, ctx) => {
      if (!parent.workspaceId) return null;
      return ctx.dataloaders.notification.workspaceById.load(
        parent.workspaceId
      );
    },
    project: (parent, _, ctx) => {
      if (!parent.projectId) return null;
      return ctx.dataloaders.notification.projectById.load(parent.projectId);
    },
  },
};
