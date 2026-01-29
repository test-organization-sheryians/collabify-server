import { bpubRedis, appRedis } from "../redis";
import { createQueue } from "../../services/bullmq/queue.factory";
import { logger } from "../../shared/logger";
import * as os from "os";
import { KeyFactory } from "../redis/keys";

/**
 * Stream Worker (The "Bridge")
 */

// ARCHITECTURE DECISION: Global Group Name (Versioned)
// We use a single group name across all chat streams to allow
// efficient consumption if we ever merge streams.
// Isolation is achieved by the stream keys themselves.
const WORKER_GROUP_NAME = "chat-workers:v1";
const CONSUMER_NAME = `worker-${os.hostname()}-${process.pid}`;
const BATCH_COUNT = 10;
const BLOCK_MS = 2000;

// Queue for Async Persistence
const persistenceQueue = createQueue("chat-persistence");

// Helper: Publish with Timeout (Backpressure Safety)
const publishSafe = async (
  topic: string,
  message: string,
  timeoutMs: number = 50
) => {
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Publish Timeout")), timeoutMs)
    );
    await Promise.race([appRedis.publish(topic, message), timeout]);
  } catch (err) {
    // Log & Drop (Best Effort)
    logger.warn({ topic, err }, "PubSub: Dropped Message (Backpressure)");
  }
};

export const streamWorker = {
  isRunning: false,
  assignedStreams: new Set<string>(),
  knownGroups: new Set<string>(), // Cache for existing consumer groups

  async init() {
    this.isRunning = true;
    logger.info(
      { group: WORKER_GROUP_NAME, consumer: CONSUMER_NAME },
      "Starting Stream Worker (Hardened Mode)"
    );

    // Start Loops
    this.heartbeatLoop();
    this.consumptionLoop();
    this.recoveryLoop(); // The Janitor
  },

  async heartbeatLoop() {
    while (this.isRunning) {
      try {
        // ZADD: Use current timestamp as score for Liveness
        await appRedis.zadd(
          KeyFactory.WorkerRegistry,
          Date.now(),
          CONSUMER_NAME
        );
        await new Promise((r) => setTimeout(r, 5000));
      } catch (err) {
        logger.error({ err }, "Heartbeat Failed");
      }
    }
  },

  /**
   * Main Consumption Loop
   * Reads NEW messages (>) with Blocking.
   */
  async consumptionLoop() {
    while (this.isRunning) {
      try {
        // 1. Fetch Assignments
        const streams = await appRedis.smembers(
          KeyFactory.WorkerAssignment(CONSUMER_NAME)
        );

        if (streams.length === 0) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }

        // Optimization: Ensure groups exist (Cached)
        // FIX: Map ID -> Stream Key
        const fullStreamKeys = streams.map((id) =>
          KeyFactory.ConversationStream(id)
        );
        await this.ensureGroups(fullStreamKeys);

        // 2. Read Args
        const ids = streams.map(() => ">");

        // 3. Block for 2000ms (Short Poll for responsiveness)
        // We removed the 'Signal' stream to prevent group collision and complexity.
        const result = (await bpubRedis.xreadgroup(
          "GROUP",
          WORKER_GROUP_NAME,
          CONSUMER_NAME,
          "COUNT",
          BATCH_COUNT,
          "BLOCK",
          BLOCK_MS,
          "STREAMS",
          ...fullStreamKeys,
          ...ids
        )) as any;

        if (result) {
          for (const [streamKey, messages] of result) {
            for (const [id, fields] of messages) {
              await this.safeProcessMessage(streamKey, id, fields);
            }
          }
        }
      } catch (err: any) {
        if (err?.message?.includes("NOGROUP")) {
          logger.warn(
            "Stream Worker encountered NOGROUP error. Clearing Group Cache to force re-creation."
          );
          this.knownGroups.clear();
        } else {
          logger.error({ err }, "Stream Worker Loop Error");
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  },

  /**
   * Recovery Loop (The Janitor)
   * Claims pending messages (PEL) from dead/crashed workers.
   */
  async recoveryLoop() {
    while (this.isRunning) {
      try {
        // Run every 60s
        await new Promise((r) => setTimeout(r, 60000)); // TODO: Extract to config

        const streams = await appRedis.smembers(
          KeyFactory.WorkerAssignment(CONSUMER_NAME)
        );

        for (const rawId of streams) {
          const stream = KeyFactory.ConversationStream(rawId);
          // XAUTOCLAIM: Stream, Group, Consumer, MinIdleTime(60s), StartId(0-0), Count
          const result = (await appRedis.xautoclaim(
            stream,
            WORKER_GROUP_NAME,
            CONSUMER_NAME,
            "60000",
            "0-0",
            "COUNT",
            "10"
          )) as any;

          // Result: [NextId, [Messages], [DeletedIds]] (Redis 6.2+)
          const messages = result[1];

          if (messages && messages.length > 0) {
            logger.warn(
              { stream, count: messages.length },
              "Janitor: Claimed Stale Messages"
            );
            for (const [id, fields] of messages) {
              await this.safeProcessMessage(stream, id, fields);
            }
          }
        }
      } catch (err) {
        logger.error({ err }, "Janitor Loop Error");
      }
    }
  },

  async ensureGroups(streams: string[]) {
    // 2. Cap Cache Size (Memory Leak Fix)
    if (this.knownGroups.size > 5000) {
      this.knownGroups.clear(); // Simple periodic flush to prevent unbound growth
    }

    for (const stream of streams) {
      if (this.knownGroups.has(stream)) continue;

      try {
        await bpubRedis.xgroup(
          "CREATE",
          stream,
          WORKER_GROUP_NAME,
          "0",
          "MKSTREAM"
        );
        this.knownGroups.add(stream);
      } catch (err: any) {
        if (err.message.includes("BUSYGROUP")) {
          this.knownGroups.add(stream);
        }
      }
    }
  },

  /**
   * Safe Processor (Poison Pill Defense + DLQ)
   */
  async safeProcessMessage(streamKey: string, id: string, fields: string[]) {
    try {
      await this.processMessage(streamKey, id, fields);
      // ACK only on success
      await bpubRedis.xack(streamKey, WORKER_GROUP_NAME, id);
    } catch (error: any) {
      logger.error({ error, streamKey, id }, "Poison Pill: Moving to DLQ");

      // ARCHITECTURE DECISION: Dead Letter Policy (Parking Lot)
      try {
        await appRedis.xadd(
          KeyFactory.DLQ,
          "*",
          "error",
          error.message || "Unknown",
          "original_stream",
          streamKey,
          "original_id",
          id,
          "payload",
          JSON.stringify(fields),
          "failedAt",
          new Date().toISOString()
        );
      } catch (dlqErr) {
        logger.error({ dlqErr }, "CRITICAL: Failed to write to DLQ");
      }

      // Clear checking to prevent loop block
      await bpubRedis.xack(streamKey, WORKER_GROUP_NAME, id);
    }
  },

  async processMessage(streamKey: string, id: string, fields: string[]) {
    // Parse fields
    const data: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      data[fields[i]] = fields[i + 1];
    }

    const {
      conversationId,
      type,
      payload: payloadStr,
      dedupeId,
      outboxId,
      authorId,
      sequence: sequenceStr, // NEW
    } = data;

    if (!conversationId || !payloadStr) {
      throw new Error("Invalid Message Format");
    }

    // 1. Fan-Out (Transport) using KeyFactory for Topic
    const topic = KeyFactory.ConversationTopic(conversationId);

    // Merge Payload
    const rawPayload = JSON.parse(payloadStr);
    const sequence = sequenceStr ? parseInt(sequenceStr) : 0; // Robust Parsing

    const downstreamData = {
      ...rawPayload,
      messageId: dedupeId, // CRITICAL: Client validation requires messageId
      streamId: id,
      sequence, // INJECT SEQUENCE for Client
      authorId,
      createdAt: new Date().toISOString(),
    };

    const downstreamMsg = JSON.stringify({
      type,
      data: downstreamData,
    });

    // 5. Safe Publish (Backpressure Safety)
    await publishSafe(topic, downstreamMsg);

    // 2. Persist
    await persistenceQueue.add("persist-message", {
      outboxId,
      streamId: id,
      sequence, // PASS SEQUENCE to Job
      conversationId,
      authorId,
      dedupeId,
      ...rawPayload, // Flatten Payload
    });
  },

  stop() {
    this.isRunning = false;
  },
};
