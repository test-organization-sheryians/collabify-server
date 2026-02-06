import createSubscriber from "pg-listen";
import { db } from "@/infra/db";
import { env } from "@/shared/config/env";
import { logger } from "@/shared/logger";
import { createQueue } from "@/services/bullmq";
import { QUEUE_NAMES } from "../core/constants";
import { DeciderJobData } from "../core/types";

const BATCH_SIZE = 500;
const POLLING_INTERVAL_MS = 10000; // 10 seconds backup

// BullMQ Queue for Decider
const deciderQueue = createQueue<DeciderJobData>(QUEUE_NAMES.DECIDER);

// PG Listener for Realtime triggers
const subscriber = createSubscriber({ connectionString: env.DATABASE_URL });

let isPolling = false;

export const OutboxPoller = {
  start: async () => {
    logger.info("🚀 Starting Outbox Poller...");

    // 1. Setup Listen
    try {
      await subscriber
        .connect()
        .then(() => logger.info("Connected to pg-listen subscriber"));
      await subscriber.listenTo("new_outbox_event");

      subscriber.notifications.on("new_outbox_event", async () => {
        logger.debug(
          "⚡ Received NOTIFY new_outbox_event, triggering poll immediately."
        );
        await OutboxPoller.pollBatch();
      });
    } catch (err) {
      logger.error(
        { err },
        "Failed to connect pg-listen subscriber. Falling back to polling only."
      );
    }

    // 2. Setup Polling Loop (Backup)
    setInterval(() => OutboxPoller.pollBatch(), POLLING_INTERVAL_MS);

    // 3. Initial Poll
    await OutboxPoller.pollBatch();
  },

  pollBatch: async () => {
    if (isPolling) return;
    isPolling = true;

    try {
      // Process pending events with SKIP LOCKED for concurrency safety
      const events = await db.$queryRawUnsafe<
        {
          id: bigint;
          event_type: string;
          payload: Record<string, unknown>;
          created_at: Date;
        }[]
      >(`
        UPDATE "notification_outbox"
        SET status = 'PROCESSING', "processed_at" = NOW()
        WHERE id IN (
          SELECT id
          FROM "notification_outbox"
          WHERE status = 'PENDING'
          ORDER BY "created_at" ASC
          LIMIT ${BATCH_SIZE}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *;
      `);

      if (events.length === 0) return;

      logger.debug({ count: events.length }, "Processing Outbox Batch");

      const jobs = events.map((event) => ({
        name: event.event_type,
        data: {
          eventId: String(event.id), // BigInt to String
          type: event.event_type,
          payload: event.payload,
          createdAt: event.created_at,
        },
        opts: {
          removeOnComplete: true,
          removeOnFail: false, // Keep failed jobs in DLQ
        },
      }));

      // Add to BullMQ
      await deciderQueue.addBulk(jobs);

      // Mark as COMPLETED after successful handoff to queue
      const ids = events.map((e) => e.id);

      await db.notificationOutbox.updateMany({
        where: { id: { in: ids } },
        data: { status: "COMPLETED" },
      });
    } catch (err) {
      logger.error({ err }, "Error in Outbox Poller loop");
    } finally {
      isPolling = false;
    }
  },
};
