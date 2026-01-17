import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { logger } from "@/shared/logger";
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

  logger.info(
    { userId: actorUserId, count: result.count, ids },
    "Marked notifications as read"
  );

  return true;
};
