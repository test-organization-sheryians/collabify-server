import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("notification:services:read");
import { MarkAllNotificationsReadInput } from "./types";

export const markAllNotificationsRead = async (
  input: MarkAllNotificationsReadInput,
  ctx: ServiceContext
): Promise<boolean> => {
  const { db } = ctx;
  const { actorUserId } = input;

  if (!actorUserId) {
    throw AppError.unauthorized("Unauthorized");
  }

  const result = await db.notification.updateMany({
    where: {
      recipientUserId: actorUserId,
      isRead: false,
    },
    data: { isRead: true },
  });

  logger.info("Marked ALL notifications as read", {
    userId: actorUserId,
    count: result.count,
  });

  return true;
};
