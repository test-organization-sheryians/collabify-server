import { db } from "@/infra/db";
import { z } from "zod";
import * as countCache from "../../channels/in-app/inapp.count-cache";
import { createLogger } from "@/shared/lib/logger";

// =============================================================================
// Mark All Notifications as Read
// =============================================================================

const logger = createLogger("notification:management:services:mark-all-read");

export const MarkAllNotificationsReadSchema = z.object({ actorUserId: z.string() });
export type MarkAllNotificationsReadInput = z.infer<typeof MarkAllNotificationsReadSchema>;

export async function markAllNotificationsRead(input: MarkAllNotificationsReadInput): Promise<void> {
  const { actorUserId } = input;

  await db.notification.updateMany({
    where: {
      recipientUserId: actorUserId,
      isRead:          false,
      isArchived:      false,
    },
    data: { isRead: true },
  });

  // Reset the Redis counter to 0 (all marked read)
  await countCache.reset(actorUserId);

  logger.debug("mark-all-read: completed", { userId: actorUserId });
}
