import { Prisma } from "@prisma/client";
import { NotificationEvent } from "../core/types";
import { AppError } from "@/shared/errors";
import { logger } from "@/shared/logger";

// Type alias for a Transaction Client
// This ensures we can pass either the global client OR a transaction proxy
type PrismaTransaction = Prisma.TransactionClient;

export const OutboxWriter = {
  /**
   * Persists a notification event to the Outbox table transactionally.
   * STRICT: This function MUST be called within a transaction if the business operation
   * (e.g., creating a comment) is transactional.
   */
  emit: async (
    tx: PrismaTransaction,
    event: NotificationEvent
  ): Promise<void> => {
    try {
      if (!event.type || !event.payload) {
        throw new AppError("Payload missing", "BAD_REQUEST", 400, true, {
          event,
        });
      }

      await tx.notificationOutbox.create({
        data: {
          eventType: event.type,
          payload: {
            ...event.payload,
            actorId: event.actorId,
            tenantId: event.tenantId,
          },
          deduplicationId: event.deduplicationId,
        },
      });

      logger.debug(
        { type: event.type, actor: event.actorId },
        "Event emitted to Outbox"
      );
    } catch (error) {
      // Re-throw AppErrors, wrap unknown errors
      if (error instanceof AppError) throw error;
      throw new AppError(
        (error as Error).message || "Internal Error",
        "INTERNAL_SERVER_ERROR",
        500
      );
    }
  },
};
