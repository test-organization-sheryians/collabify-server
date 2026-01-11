import { db as globalDb } from "@/infra/db";
import { AppError } from "@/shared/errors";
import { Prisma, PrismaClient } from "@prisma/client";
import { logger } from "@/shared/logger";
import {
  GetNotificationsSchema,
  MarkReadSchema,
  MarkAllReadSchema,
  NotificationDataSchema,
} from "./types";

export interface GetNotificationsFilter {
  isRead?: boolean;
}

export const InboxService = {
  /**
   * Fetch paginated notifications for the user.
   */
  getNotifications: async (
    userId: string,
    limit = 20,
    cursor?: string,
    filter?: GetNotificationsFilter,
    txOrClient?: PrismaClient | Prisma.TransactionClient
  ) => {
    const args = GetNotificationsSchema.parse({
      userId,
      limit,
      cursor,
      filter,
    });

    const db = txOrClient || globalDb;

    const where: Prisma.NotificationWhereInput = {
      recipientUserId: args.userId,
      ...(args.filter?.isRead !== undefined
        ? { isRead: args.filter.isRead }
        : {}),
    };

    const notifications = await db.notification.findMany({
      where,
      take: args.limit + 1, // +1 for hasNextPage
      cursor: args.cursor ? { id: args.cursor } : undefined,
      orderBy: { createdAt: "desc" },
    });

    let hasNextPage = false;
    if (notifications.length > args.limit) {
      hasNextPage = true;
      notifications.pop(); // Remove extra item
    }

    const nextCursor = hasNextPage
      ? notifications[notifications.length - 1].id
      : null;

    return {
      items: notifications.map((n) => {
        // VERIFY: Runtime check to ensure DB data matches our Type expectation
        // This throws if the data is corrupt, preventing frontend crashes
        const parsedData = NotificationDataSchema.parse(n.data);

        return {
          ...n,
          data: parsedData,
        };
      }),
      pageInfo: {
        hasNextPage,
        endCursor: nextCursor,
      },
    };
  },

  /**
   * Get unread count.
   */
  getUnreadCount: async (
    userId: string,
    txOrClient?: PrismaClient | Prisma.TransactionClient
  ): Promise<number> => {
    // Basic ID validation
    if (!userId) throw new AppError("UserId is required", "BAD_REQUEST", 400);
    const db = txOrClient || globalDb;

    return db.notification.count({
      where: {
        recipientUserId: userId,
        isRead: false,
      },
    });
  },

  /**
   * Mark a single notification or list of notifications as read.
   */
  markAsRead: async (
    userId: string,
    notificationIds: string[],
    txOrClient?: PrismaClient | Prisma.TransactionClient
  ): Promise<void> => {
    const args = MarkReadSchema.parse({ userId, notificationIds });
    const db = txOrClient || globalDb;

    const result = await db.notification.updateMany({
      where: {
        recipientUserId: args.userId,
        id: { in: args.notificationIds },
      },
      data: { isRead: true },
    });

    logger.info(
      { userId: args.userId, count: result.count, ids: args.notificationIds },
      "Marked notifications as read"
    );
  },

  /**
   * Mark all notifications as read for the user.
   */
  markAllAsRead: async (
    userId: string,
    txOrClient?: PrismaClient | Prisma.TransactionClient
  ): Promise<void> => {
    const args = MarkAllReadSchema.parse({ userId });
    const db = txOrClient || globalDb;

    const result = await db.notification.updateMany({
      where: {
        recipientUserId: args.userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    logger.info(
      { userId: args.userId, count: result.count },
      "Marked ALL notifications as read"
    );
  },
};
