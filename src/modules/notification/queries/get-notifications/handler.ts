import { ServiceContext } from "@/graphql/types";
import { Prisma } from "@prisma/client";
import { GetNotificationsInput, GetNotificationsResult } from "./types";
import { AppError } from "@/shared/errors";

export const getNotifications = async (
  input: GetNotificationsInput,
  ctx: ServiceContext
): Promise<GetNotificationsResult> => {
  const { db } = ctx;
  const { userId, limit, cursor, filter } = input;

  if (!userId) {
    throw AppError.unauthorized("Unauthorized");
  }

  const where: Prisma.NotificationWhereInput = {
    recipientUserId: userId,
    ...(filter?.isRead !== undefined ? { isRead: filter.isRead } : {}),
  };

  const notifications = await db.notification.findMany({
    where,
    take: limit + 1, // +1 for hasNextPage
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: "desc" },
  });

  let hasNextPage = false;
  if (notifications.length > limit) {
    hasNextPage = true;
    notifications.pop(); // Remove extra item
  }

  const nextCursor = hasNextPage
    ? notifications[notifications.length - 1].id
    : null;

  return {
    items: notifications,
    pageInfo: {
      hasNextPage,
      endCursor: nextCursor,
    },
  };
};
