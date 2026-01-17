import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { GetUnreadCountInput } from "./types";

export const getUnreadCount = async (
  input: GetUnreadCountInput,
  ctx: ServiceContext
): Promise<number> => {
  const { db } = ctx;
  const { userId } = input;

  if (!userId) {
    throw AppError.unauthorized("Unauthorized");
  }

  return db.notification.count({
    where: {
      recipientUserId: userId,
      isRead: false,
    },
  });
};
