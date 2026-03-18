import { bpubRedis, appRedis } from "../redis";
import { createLogger } from "../../shared/lib/logger";

const logger = createLogger("infra:ws:worker");
import * as os from "os";
import { KeyFactory } from "../redis/keys";
import { persistenceQueue } from "@/modules/chat/jobs/queues";
import {
  queueReactionPersistence,
  periodicFlush,
} from "@/modules/chat/domain/reactions/batch-persistence";

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

// Helper: Publish with Timeout (Backpressure Safety)
const publishSafe = async (
  topic: string,
  message: string,
  timeoutMs: number = 200  // Increased from 50ms — safer under load
) => {
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Publish Timeout")), timeoutMs)
    );
    await Promise.race([appRedis.publish(topic, message), timeout]);
  } catch (err) {
    // Log & Drop (Best Effort)
    logger.warn("PubSub: Dropped Message (Backpressure)", { topic, err });
  }
};

export const streamWorker = {
  isRunning: false,
  assignedStreams: new Set<string>(),
  knownGroups: new Set<string>(), // Cache for existing consumer groups

  async init() {
    this.isRunning = true;
    logger.info("Starting Stream Worker (Hardened Mode)", {
      group: WORKER_GROUP_NAME,
      consumer: CONSUMER_NAME,
    });

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

        // Flush any pending reactions that didn't hit batch size
        await periodicFlush();

        await new Promise((r) => setTimeout(r, 5000));
      } catch (err) {
        logger.error("Heartbeat Failed", { err });
      }
    }
  },

  /**
   * Main Consumption Loop
   * Reads NEW messages (>) with Blocking.
   */
  async consumptionLoop() {
    let emptyLoopCount = 0  // Self-healing: detect stalled worker after Redis flush

    while (this.isRunning) {
      try {
        // 1. Fetch Assignments
        const streams = await appRedis.smembers(
          KeyFactory.WorkerAssignment(CONSUMER_NAME)
        );

        if (streams.length === 0) {
          emptyLoopCount++

          // Self-heal: if no assignments for ~10s, bump epoch to trigger rebalance
          // This recovers automatically after a Redis FLUSHDB without requiring a restart
          if (emptyLoopCount % 10 === 0) {
            logger.warn("Worker idle — no stream assignments. Triggering coordinator rebalance.", {
              emptyLoopCount,
              consumer: CONSUMER_NAME,
            })
            await appRedis.incr(KeyFactory.EpochConversations).catch(() => {})
          }

          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }

        emptyLoopCount = 0  // Reset counter when we have assignments

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
          logger.error("Stream Worker Loop Error", { err });
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
            logger.warn("Janitor: Claimed Stale Messages", {
              stream,
              count: messages.length,
            });
            for (const [id, fields] of messages) {
              await this.safeProcessMessage(stream, id, fields);
            }
          }
        }
      } catch (err) {
        logger.error("Janitor Loop Error", { err });
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
      logger.error("Poison Pill: Moving to DLQ", { error, streamKey, id });

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
        logger.error("CRITICAL: Failed to write to DLQ", { dlqErr });
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
      messageId,
      editorUserId,
      deleterUserId,
    } = data;

    if (!conversationId || !payloadStr) {
      throw new Error("Invalid Message Format");
    }

    const topic = KeyFactory.ConversationTopic(conversationId);

    // ✅ M-7: Safe JSON parsing with error handling
    let rawPayload;
    try {
      rawPayload = JSON.parse(payloadStr);
    } catch (parseError: any) {
      logger.error("Failed to parse event payload JSON", {
        parseError,
        payloadStr,
        conversationId,
      });
      throw new Error("INVALID_JSON_PAYLOAD");
    }

    // ═══════════════════════════════════════════════════════════
    // HANDLE: chat:message-edited
    // ═══════════════════════════════════════════════════════════
    if (type === "chat:message-edited") {
      // 1. Fan-out to subscribed clients
      const downstreamMsg = JSON.stringify({
        type,
        success: true,  // Required by client ServerMessage protocol
        data: rawPayload,
      });
      await publishSafe(topic, downstreamMsg);

      // 2. Enqueue persistence job
      await persistenceQueue.add(
        "persist-message-edit",
        {
          outboxId,
          messageId: rawPayload.messageId,
          content: rawPayload.content,
          editedAt: rawPayload.editedAt,
          editorUserId: rawPayload.editorUserId,
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: true,
        }
      );

      return; // Early return after handling edit
    }

    // ═══════════════════════════════════════════════════════════
    // HANDLE: chat:message-deleted
    // ═══════════════════════════════════════════════════════════
    if (type === "chat:message-deleted") {
      // 1. Fan-out to subscribed clients
      const downstreamMsg = JSON.stringify({
        type,
        success: true,  // Required by client ServerMessage protocol
        data: rawPayload,
      });
      await publishSafe(topic, downstreamMsg);

      // 2. Enqueue persistence job
      await persistenceQueue.add(
        "persist-message-delete",
        {
          outboxId,
          messageId: rawPayload.messageId,
          deletedAt: rawPayload.deletedAt,
          deleterUserId: rawPayload.deleterUserId,
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: true,
        }
      );

      return; // Early return after handling delete
    }

    // ═══════════════════════════════════════════════════════════
    // HANDLE: chat:reaction-added & chat:reaction-removed
    // ═══════════════════════════════════════════════════════════
    if (type === "chat:reaction-added" || type === "chat:reaction-removed") {
      // Queue for batch persistence
      await queueReactionPersistence({
        type: type as "chat:reaction-added" | "chat:reaction-removed",
        messageId: rawPayload.messageId,
        userId: rawPayload.userId,
        emoji: rawPayload.emoji,
        timestamp: rawPayload.timestamp,
      });

      // Broadcast to subscribers (fan-out)
      const downstreamMsg = JSON.stringify({
        type,
        success: true,  // Required by client ServerMessage protocol
        data: rawPayload,
      });
      await publishSafe(topic, downstreamMsg);

      return; // Early return after handling reaction
    }

    // ═══════════════════════════════════════════════════════════
    // HANDLE: chat:new-message (existing logic)
    // ═══════════════════════════════════════════════════════════
    // 1. Fan-Out (Transport) using KeyFactory for Topic
    const sequence = sequenceStr ? parseInt(sequenceStr) : 0; // Robust Parsing

    const downstreamData = {
      ...rawPayload,
      messageId: dedupeId, // CRITICAL: Client validation requires messageId
      streamId: id,
      sequence, // INJECT SEQUENCE for Client
      authorId,
      createdAt: new Date().toISOString(),
      parentMessageId: rawPayload.parentMessageId || null, // For inline replies (message-reference)
    };

    const downstreamMsg = JSON.stringify({
      type,
      success: true,  // Required by client ServerMessage protocol
      data: downstreamData,
    });

    // 5. Safe Publish (Backpressure Safety)
    await publishSafe(topic, downstreamMsg);

    // ✅ NEW: Track delivery implicitly
    // When we publish new-message, we know it was delivered to subscribed users
    const subscribedUsers = await appRedis.smembers(
      `subscriptions:${conversationId}`
    );
    if (subscribedUsers.length > 0 && sequence > 0) {
      const pipeline = appRedis.pipeline();

      subscribedUsers.forEach((userId) => {
        pipeline.zadd(`delivered:${conversationId}`, sequence, userId);
      });

      pipeline.expire(`delivered:${conversationId}`, 7 * 24 * 60 * 60); // 7 days

      await pipeline.exec();
    }

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
