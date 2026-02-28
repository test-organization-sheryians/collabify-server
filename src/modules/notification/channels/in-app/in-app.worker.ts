import { Job } from "bullmq";
import { createWorker } from "@/services/bullmq";
import { QUEUE_NAMES, REDIS_KEYS } from "../../core/constants";
import { InAppJobData } from "../../core/types";
import { db } from "@/infra/db";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("notification:channel:in-app");
import { redis } from "@/infra/redis";

export const createInAppWorker = () => {
  return createWorker<InAppJobData>(
    QUEUE_NAMES.IN_APP,
    async (job: Job<InAppJobData>) => {
      const { userId, eventId } = job.data;
      const eventType = job.name; // "workspace.invite"

      // 0. Idempotency Check
      const lockKey = `${REDIS_KEYS.IDEMPOTENCY_PREFIX}${eventId}:inapp`;
      const acquired = await redis.set(lockKey, "1", "EX", 86400, "NX");

      if (!acquired) {
        logger.debug("Duplicate InApp Job Dropped", { eventId, userId });
        return;
      }

      // 1. Persist Notification using Helper (Dumb Persistence)
      // The Decider already transformed the payload into { message, link, ... }
      await db.notification.create({
        data: {
          recipientUserId: userId,
          category: "general",
          entityType: "system", // We could add entityType to InAppJobData if needed
          entityId: "global",

          // IMPORTANT: We inject the 'type' here so the Frontend receives it in the JSON Blob
          data: {
            type: eventType,
            ...job.data,
          },
          isRead: false,
        },
      });

      logger.debug("In-App Notification Persisted", {
        userId,
        type: eventType,
      });
    }
  );
};
