import { Prisma } from "@prisma/client";
import { createLogger } from "@/shared/lib/logger";
import { notifDebug } from "../shared/debug/notification-debug";
import type { TypedOutboxEvent } from "../events/event-map";

const logger = createLogger("notification:outbox:writer");

type PrismaTransaction = Prisma.TransactionClient;

/**
 * Write a notification event to the outbox table as part of a DB transaction.
 *
 * MUST be called inside a Prisma transaction alongside the domain operation.
 * If the transaction rolls back, the outbox row is never inserted, guaranteeing
 * the Transactional Outbox pattern.
 *
 * Type safety:
 * - `event.type` must be a registered EventType — typos are compile errors.
 * - `event.payload` must exactly match the Zod schema for that event — wrong
 *   fields or missing required fields are compile errors.
 *
 * @example
 * await db.$transaction(async (tx) => {
 *   await tx.workspaceInvite.create({ ... });
 *   await emit(tx, { type: "workspace.invite.sent", payload: { ... } });
 * });
 */
export async function emit(
  tx: PrismaTransaction,
  event: TypedOutboxEvent
): Promise<void> {
  await tx.notificationOutbox.create({
    data: {
      eventType:       event.type,
      payload:         event.payload as Prisma.InputJsonValue,
      deduplicationId: event.deduplicationId,
    },
  });

  logger.debug("Outbox event emitted", { type: event.type });
  notifDebug.emit({ type: event.type, deduplicationId: event.deduplicationId });
}

// Re-export types for convenience at call sites
export type { TypedOutboxEvent, EventPayload } from "../events/event-map";

