import { db } from "@/infra/db";
import { z } from "zod";
import * as countCache from "../../channels/in-app/inapp.count-cache";
import { createLogger } from "@/shared/lib/logger";

// =============================================================================
// Mark Notification(s) as Read
// =============================================================================

const logger = createLogger("notification:management:services:mark-read");

export const MarkNotificationReadSchema = z.object({
  ids:          z.array(z.string()).min(1).max(100),
  actorUserId:  z.string(),
});

export type MarkNotificationReadInput = z.infer<typeof MarkNotificationReadSchema>;

export async function markNotificationRead(input: MarkNotificationReadInput): Promise<void> {
  const { ids, actorUserId } = input;

  // Only mark rows that belong to this user (ownership check)
  const result = await db.notification.updateMany({
    where: {
      id:              { in: ids },
      recipientUserId: actorUserId,
      isRead:          false,
    },
    data: { isRead: true },
  });

  if (result.count > 0) {
    await countCache.decrement(actorUserId, result.count);
  }

  logger.debug("mark-notification-read: marked", {
    userId: actorUserId,
    requested: ids.length,
    updated:   result.count,
  });
}
