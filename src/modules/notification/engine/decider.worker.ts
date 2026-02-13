import { Job } from "bullmq";
import { createWorker, createQueue } from "@/services/bullmq";
import { AppError } from "@/shared/errors";
import { QUEUE_NAMES } from "../core/constants";
import { DeciderJobData, NotificationChannel } from "../core/types";
import { EventRegistry } from "../events/registry";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("notification:engine:decider");
import * as Guards from "./decider/guards";
import * as Routing from "./decider/routing";

// -----------------------------------------------------------------------------
// QUEUE SETUP
// -----------------------------------------------------------------------------
const emailQueue = createQueue(QUEUE_NAMES.EMAIL);
const pushQueue = createQueue(QUEUE_NAMES.PUSH);
const inAppQueue = createQueue(QUEUE_NAMES.IN_APP);
const batchQueue = createQueue(QUEUE_NAMES.BATCH);

const getQueueForChannel = (channel: NotificationChannel) => {
  switch (channel) {
    case NotificationChannel.EMAIL:
      return emailQueue;
    case NotificationChannel.PUSH:
      return pushQueue;
    case NotificationChannel.IN_APP:
      return inAppQueue;
    case NotificationChannel.SMS:
      return null;
    default:
      return null;
  }
};

// -----------------------------------------------------------------------------
// WORKER FACTORY
// -----------------------------------------------------------------------------
export const createDeciderWorker = () => {
  return createWorker<DeciderJobData>(
    QUEUE_NAMES.DECIDER,
    async (job: Job<DeciderJobData>) => {
      const { type, payload: rawPayload, eventId } = job.data;

      // 1. Guards: Idempotency
      if (!(await Guards.checkIdempotency(eventId, job.id || ""))) return;

      logger.debug("Decider processing job", { jobId: job.id, type });

      // 2. Definition & Schema Validation
      const definition = EventRegistry.get(type);
      if (!definition) {
        logger.warn("Unknown event type, skipping", { type });
        return;
      }

      const schema = EventRegistry.getSchema(type);
      if (!schema) {
        throw new AppError(
          `Schema missing: ${type}`,
          "DECIDER_SCHEMA_MISSING",
          400,
          false
        );
      }

      const parseResult = schema.safeParse(rawPayload);
      if (!parseResult.success) {
        logger.error("Invalid Payload - Dropping", {
          errors: parseResult.error.format(),
          type,
        });
        return;
      }
      const valPayload = parseResult.data as Record<string, unknown>;
      const strategy = definition.strategy || {};

      // 3. User Resolution
      const rawUserId =
        valPayload["recipientId"] ||
        valPayload["userId"] ||
        valPayload["actorId"];

      if (typeof rawUserId !== "string" || !rawUserId) {
        logger.warn("No valid Recipient ID found", { type, rawUserId });
        return;
      }
      const userId: string = rawUserId;

      // 4. Guards: Rate Limit & Access
      if (!(await Guards.checkRateLimit(userId, type))) return;
      if (!(await Guards.checkAccess(userId, type, strategy, valPayload)))
        return;

      // 5. Routing: Batching
      const batchDecision = Routing.shouldBatch(type, strategy);
      if (batchDecision.enabled) {
        logger.debug("Routing to Batch Queue", { eventId, type });
        await batchQueue.add(
          type,
          { ...job.data, userId, payload: valPayload },
          { delay: batchDecision.delay }
        );
        return;
      }

      // 6. Routing: Preferences & Fan-Out
      const preferences = await Routing.getPreferences(userId, strategy);

      await Promise.all(
        definition.channels.map(async (channel) => {
          if (!Routing.isChannelEnabled(channel, preferences, strategy)) return;

          const queue = getQueueForChannel(channel);
          if (!queue) return;

          const transformer = definition.transformers[channel];
          if (!transformer) {
            logger.warn("Transformer missing", { type, channel });
            return;
          }

          // Transform & Dispatch
          // @ts-expect-error - Generic complexity
          const content = transformer(valPayload);

          await queue.add(type, {
            ...content,
            eventId,
            userId,
          });

          logger.debug("Routed to channel", { eventId, channel, userId });
        })
      );
    }
  );
};
