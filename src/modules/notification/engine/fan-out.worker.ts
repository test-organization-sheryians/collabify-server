import { createWorker } from "@/services/bullmq";
import { QUEUE_NAMES, CONCURRENCY } from "../constants";
import { createLogger } from "@/shared/lib/logger";
import * as registry from "../events/registry";
import * as presenceChecker from "../shared/presence/presence-checker";
import * as preferenceResolver from "../shared/preferences/preference-resolver";
import {
  emailQueue,
  inAppQueue,
  pushQueue,
  realtimeQueue,
} from "../shared/queues/queue-registry";
import type { FanoutJobData, Channel, Recipient } from "../events/types";
import type { NotificationContext } from "../shared/preferences/preference-types";

// =============================================================================
// Fanout Worker (Phase 5.2)
//
// Processes FanoutQueue jobs produced by the Decider for large fan-outs.
// Each job carries a chunk of up to 50 recipients.
//
// Per recipient, it runs the same delivery pipeline as the Decider's inline path:
//   preference resolution → channel dispatch
//
// If there are more pages (nextCursor set), the Decider already dispatched
// multiple FanoutQueue chunks — this worker just handles its chunk.
// =============================================================================

const logger = createLogger("notification:engine:fanout");

export const createFanoutWorker = () =>
  createWorker<FanoutJobData>(
    QUEUE_NAMES.FANOUT,
    async (job) => {
      const { eventId, type, payload, recipients } = job.data;

      logger.debug("Fanout worker: processing chunk", {
        jobId:      job.id,
        eventId,
        type,
        recipients: recipients.length,
      });

      const entry = registry.get(type);
      if (!entry) {
        logger.warn("Fanout worker: unknown event type — dropping chunk", { type, eventId });
        return;
      }
      const { definition, handler } = entry;

      const context: NotificationContext = {
        workspaceId:    payload.workspaceId    as string | undefined,
        projectId:      payload.projectId      as string | undefined,
        conversationId: payload.conversationId as string | undefined,
      };

      await Promise.all(
        recipients.map(async (recipient: Recipient) => {
          if (!recipient.userId) {
            // External invitee — email only
            const emailContent = await handler.buildEmail?.(payload, recipient);
            if (!emailContent) return;
            await emailQueue.add(`email:${eventId}:${recipient.email}`, {
              eventId,
              recipientUserId: null,
              content: emailContent,
              idempotencyKey:  `${eventId}:${recipient.email}`,
            });
            return;
          }

          const userId    = recipient.userId;
          const isOnline  = await presenceChecker.isOnline(userId);
          const resolution = await preferenceResolver.resolve(userId, definition, context, isOnline);

          if (!resolution.deliver) return;

          const idempotencyKey = `${eventId}:${userId}`;

          await Promise.all(
            resolution.activeChannels.map(async (channel: Channel) => {
              if (channel === "EMAIL") {
                const content = await handler.buildEmail?.(payload, recipient);
                if (!content) return;
                await emailQueue.add(`email:${eventId}:${userId}`, {
                  eventId, recipientUserId: userId, content, idempotencyKey,
                });
              } else if (channel === "IN_APP") {
                const content = await handler.buildInApp?.(payload, recipient);
                if (!content) return;
                await inAppQueue.add(`inapp:${eventId}:${userId}`, {
                  eventId, type, recipientUserId: userId, content, idempotencyKey,
                });
              } else if (channel === "PUSH") {
                const content = await handler.buildPush?.(payload, recipient);
                if (!content) return;
                await pushQueue.add(`push:${eventId}:${userId}`, {
                  eventId, recipientUserId: userId, content, idempotencyKey,
                });
              } else if (channel === "REALTIME") {
                const content = await handler.buildRealtime?.(payload, recipient);
                if (!content) return;
                await realtimeQueue.add(`rt:${eventId}:${userId}`, {
                  eventId, recipientUserId: userId, content, idempotencyKey,
                });
              }
            })
          );
        })
      );

      logger.debug("Fanout worker: chunk complete", { eventId, type });
    },
    { concurrency: CONCURRENCY.FANOUT }
  );
