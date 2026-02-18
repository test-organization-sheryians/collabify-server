import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("notification:services:read");
import { MarkNotificationReadInput } from "./types";

export const markNotificationRead = async (
  input: MarkNotificationReadInput,
  ctx: ServiceContext
): Promise<boolean> => {
  const { db } = ctx;
  const { ids, actorUserId } = input;

  if (!actorUserId) {
    throw AppError.unauthorized("Unauthorized");
  }

  const result = await db.notification.updateMany({
    where: {
      recipientUserId: actorUserId,
      id: { in: ids },
    },
    data: { isRead: true },
  });

  logger.info("Marked notifications as read", {
    userId: actorUserId,
    count: result.count,
    ids,
  });

  return true;
};
