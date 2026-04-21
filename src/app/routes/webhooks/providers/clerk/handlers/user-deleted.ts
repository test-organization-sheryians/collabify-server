import { db } from "@/infra/db";
import { createLogger } from "@/shared/lib/logger";
import type { UserDeletedPayload } from "../types";

const logger = createLogger("webhooks:clerk:user-deleted");

export async function handleUserDeleted(event: UserDeletedPayload): Promise<void> {
  const { id } = event.data;

  if (!id) {
    logger.warn("user.deleted webhook missing id — skipping");
    return;
  }

  await db.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      status: "DELETED",
    },
  });

  logger.info("Soft-deleted user via webhook", { userId: id });
}