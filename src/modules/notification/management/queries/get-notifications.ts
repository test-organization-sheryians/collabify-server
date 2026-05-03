import { db } from "@/infra/db";
import { z } from "zod";
import { createLogger } from "@/shared/lib/logger";

// =============================================================================
// Get Notifications — Paginated Inbox Query
// =============================================================================

const logger = createLogger("notification:management:queries:get-notifications");

export const GetNotificationsSchema = z.object({
  userId: z.string(),
  limit:  z.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
  filter: z
    .object({ isRead: z.boolean().optional() })
    .optional(),
});

export type GetNotificationsInput = z.infer<typeof GetNotificationsSchema>;

export async function getNotifications(input: GetNotificationsInput) {
  const { userId, limit, cursor, filter } = input;

  const where = {
    recipientUserId: userId,
    isArchived:      false,
    ...(filter?.isRead !== undefined && { isRead: filter.isRead }),
  };

  const items = await db.notification.findMany({
    where,
    take:    limit + 1, // fetch one extra to detect hasNextPage
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
  });

  const hasNextPage = items.length > limit;
  const page        = hasNextPage ? items.slice(0, limit) : items;
  const endCursor   = page.length > 0 ? page[page.length - 1].id : null;

  logger.debug("get-notifications: fetched", {
    userId,
    count:    page.length,
    hasNextPage,
  });

  return {
    items,
    pageInfo: { hasNextPage, endCursor },
  };
}
