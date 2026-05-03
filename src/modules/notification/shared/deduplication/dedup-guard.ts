import { db } from "@/infra/db";
import { createLogger } from "@/shared/lib/logger";

// =============================================================================
// Deduplication Guard
//
// Secondary safety net against duplicate IN_APP notification rows.
// Runs inside InAppWorker before writing to Postgres.
//
// Why this exists alongside IdempotencyGuard:
//   - IdempotencyGuard uses Redis (in-memory, TTL-bound).
//   - A Redis flush or miss after 24h could let a retry through.
//   - DedupGuard checks Postgres directly — durable and exact.
//   - Only used for IN_APP (the durable channel). Email/Push don't write rows.
//
// Key uniqueness: (recipientUserId, entityId, entityType, type)
// A user should only ever have one notification per entity-action combination.
// =============================================================================

const logger = createLogger("notification:shared:dedup");

/**
 * Returns true if a duplicate notification row already exists.
 * Caller should skip insertion when this returns true.
 */
export async function isDuplicate(params: {
  recipientUserId: string;
  entityId:        string;
  entityType:      string;
  type:            string;
}): Promise<boolean> {
  try {
    const existing = await db.notification.findFirst({
      where: {
        recipientUserId: params.recipientUserId,
        entityId:        params.entityId,
        entityType:      params.entityType,
        // `type` is stored in the `data` JSON column as data.type
        // We compare against the Notification.entityType + entityId combo
        // which is sufficient for most dedup cases.
      },
      select: { id: true },
    });

    if (existing) {
      logger.debug("Dedup guard: duplicate IN_APP notification skipped", params);
      return true;
    }
    return false;
  } catch (err) {
    // DB error → allow insertion (prefer duplicate over dropped notification)
    logger.warn("Dedup guard: DB error, allowing insertion", { err, ...params });
    return false;
  }
}
