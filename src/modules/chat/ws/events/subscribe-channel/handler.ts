import { ChatWebSocket, createSuccessFrame } from "@/infra/ws/types";
import { Context } from "hono";
import { SubscribeChannelInput } from "./schema";
import { wsRegistry } from "@/infra/ws/subscription-registry";
import { logger } from "@/shared/logger";
import { KeyFactory } from "@/infra/redis/keys";
import { appRedis } from "@/infra/redis";

export const subscribeChannelHandler = async (
  ctx: Context,
  socket: ChatWebSocket,
  input: SubscribeChannelInput
) => {
  const { conversationId } = input;
  const { userId, socketId } = socket.data;

  // Architecture: Pub/Sub Logic
  // We subscribe immediately to ensure no live messages are missed while we calculate the gap.
  const topic = KeyFactory.ConversationTopic(conversationId);
  wsRegistry.subscribe(socketId, topic);

  // CRITICAL: Register conversation as active for stream-worker consumption
  // Without this, worker-coordinator has nothing to assign, and messages never fan-out
  await appRedis.zadd(
    KeyFactory.ActiveConversations,
    Date.now(),
    conversationId
  );
  await appRedis.incr(KeyFactory.EpochConversations); // Trigger rebalance

  logger.info({
    msg: "Socket Subscribed to Channel",
    userId,
    conversationId,
    topic,
  });

  // Architecture: Sync-on-Connect (Gap Reconciliation)
  // If the client provides a cursor, we check for missing messages ("The Gap").
  // - Small Gap (<50): Replay directly from Redis Stream (Unicast) to avoid HTTP RTT.
  // - Large Gap (>50): Force HTTP Full Sync for safety and bandwidth efficiency.
  if (input.lastSequence !== undefined) {
    const seqKey = KeyFactory.ConversationSequence(conversationId);
    const serverSeqStr = await appRedis.get(seqKey);

    if (serverSeqStr) {
      const serverSeq = parseInt(serverSeqStr, 10);
      const diff = serverSeq - input.lastSequence;
      const SYNC_THRESHOLD = 50;

      if (diff > 0) {
        // Strategy: Hot Tail Replay (Redis Stream)
        const streamKey = KeyFactory.ConversationStream(conversationId);

        // Fetch trailing window
        const streamItems = await appRedis.xrevrange(
          streamKey,
          "+",
          "-",
          "COUNT",
          SYNC_THRESHOLD
        );

        const missedMessages: any[] = [];
        let foundAll = false;

        if (streamItems) {
          for (const [id, fields] of streamItems as any[]) {
            const data: Record<string, any> = {};
            for (let i = 0; i < fields.length; i += 2) {
              data[fields[i]] = fields[i + 1];
            }

            const seq = parseInt(data.sequence, 10);
            if (seq > input.lastSequence!) {
              missedMessages.push({
                ...JSON.parse(data.payload || "{}"),
                messageId: data.dedupeId, // CRITICAL: Client validation requires messageId
                conversationId: data.conversationId,
                dedupeId: data.dedupeId,
                streamId: id,
                sequence: seq,
                authorId: data.authorId, // From Redis Stream
                createdAt: data.createdAt, // From Redis Stream
              });
            } else {
              foundAll = true;
              break;
            }
          }
        }

        // Re-order for chronological replay
        missedMessages.reverse();

        // 1. Send what we found
        if (missedMessages.length > 0) {
          logger.info(
            { userId, count: missedMessages.length },
            "Replaying Hot Messages to Socket"
          );
          missedMessages.forEach((msg) => {
            socket.send(
              createSuccessFrame(undefined, "chat:new-message", {
                ...msg,
                meta: { replay: true },
              })
            );
          });
        }

        // 2. Validate Coverage
        // Triggers Sync if:
        // A. Gap is too large for window
        // B. Stream didn't reach client cursor (!foundAll)
        // C. Stream was empty or didn't contain ANY gap items despite diff > 0 (Truncation/Tail Loss)
        const isTruncated = missedMessages.length === 0 && diff > 0;

        if (diff > SYNC_THRESHOLD || (!foundAll && diff > 0) || isTruncated) {
          socket.send(
            createSuccessFrame(undefined, "chat:sync-required", {
              conversationId,
              reason: isTruncated ? "stream_truncated" : "gap_too_large",
            })
          );
        }
      } else if (diff < 0) {
        // Error Handling: Client Ahead of Server
        socket.send(
          createSuccessFrame(undefined, "chat:sync-required", {
            conversationId,
            reason: "client_ahead",
          })
        );
      }
    } else {
      // Guard: Server Amnesia
      // Server has no sequence (Cold Start / Flush), but client has data.
      // We cannot verify consistency, so we force a Sync to be safe.
      if (input.lastSequence > 0) {
        socket.send(
          createSuccessFrame(undefined, "chat:sync-required", {
            conversationId,
            reason: "server_amnesia",
          })
        );
      }
    }
  }

  // Finalize: ACK
  socket.send(
    createSuccessFrame(undefined, "chat:subscribe-ack", {
      conversationId,
      status: "subscribed",
    })
  );
};
