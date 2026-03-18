import { ChatWebSocket, createSuccessFrame } from "@/infra/ws/types";
import { WSHandlerContext } from "@/infra/ws/types";
import { SubscribeConversationInput } from "./schema";
import { wsRegistry } from "@/infra/ws/subscription-registry";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("chat:ws:subscribe");
import { KeyFactory } from "@/infra/redis/keys";
import { appRedis } from "@/infra/redis";

/**
 * Unified Conversation Subscription Handler
 * Supports: CHANNEL, DM, GROUP_DM, THREAD
 * Replaces: subscribe-channel + subscribe-thread
 */
export const subscribeConversationHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: SubscribeConversationInput
) => {
  const { conversationId, conversationType } = input;
  const { userId, socketId } = socket.data;

  // 1. Authorization: assertChannelMember (cache-backed)
  if (!ctx.authGate || !ctx.permissions) {
    socket.send(JSON.stringify({ type: "chat:subscribe-error", error: { code: "UNAUTHORIZED", message: "Not authenticated" } }));
    return;
  }
  try {
    await ctx.authGate.assertChannelMember(conversationId);
  } catch {
    socket.send(
      JSON.stringify({
        type: "chat:subscribe-error",
        error: { code: "FORBIDDEN", message: "You are not a member of this conversation" },
      })
    );
    return;
  }

  // 2. Subscribe to Pub/Sub Topic
  const topic = KeyFactory.ConversationTopic(conversationId);
  await wsRegistry.subscribe(socketId, topic);

  // 3. Register conversation as active for stream-worker consumption
  await appRedis.zadd(
    KeyFactory.ActiveConversations,
    Date.now(),
    conversationId
  );
  await appRedis.incr(KeyFactory.EpochConversations); // Trigger rebalance

  logger.info("Socket Subscribed to Conversation", {
    userId,
    conversationId,
    conversationType,
    topic,
  });

  // 4. Sync-on-Connect: Hot Replay (Gap Reconciliation)
  if (input.lastSequence !== undefined) {
    const seqKey = KeyFactory.ConversationSequence(conversationId);
    const serverSeqStr = await appRedis.get(seqKey);

    if (serverSeqStr) {
      const serverSeq = parseInt(serverSeqStr, 10);
      const diff = serverSeq - input.lastSequence;
      const SYNC_THRESHOLD = 50;

      if (diff > 0) {
        // Hot Tail Replay from Redis Stream
        const streamKey = KeyFactory.ConversationStream(conversationId);

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
                messageId: data.dedupeId,
                conversationId: data.conversationId,
                dedupeId: data.dedupeId,
                streamId: id,
                sequence: seq,
                authorId: data.authorId,
                createdAt: data.createdAt,
              });
            } else {
              foundAll = true;
              break;
            }
          }
        }

        // Re-order chronologically
        missedMessages.reverse();

        // Send replayed messages
        if (missedMessages.length > 0) {
          logger.info("Replaying Hot Messages to Socket", {
            userId,
            count: missedMessages.length,
          });
          missedMessages.forEach((msg) => {
            socket.send(
              createSuccessFrame(undefined, "chat:new-message", {
                ...msg,
                meta: { replay: true },
              })
            );
          });
        }

        // Validate Coverage: Force sync if gap too large or incomplete
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
        // Client Ahead of Server
        socket.send(
          createSuccessFrame(undefined, "chat:sync-required", {
            conversationId,
            reason: "client_ahead",
          })
        );
      }
    } else {
      // Server Amnesia: No sequence key
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

  // ✅ NEW: Mark recent messages as delivered when subscribing
  const lastMessage = await ctx.db.chatMessage.findFirst({
    where: { conversationId, deletedAt: null },
    orderBy: { sequence: "desc" },
    select: { sequence: true },
  });

  if (lastMessage && lastMessage.sequence > 0) {
    await appRedis.zadd(
      `delivered:${conversationId}`,
      lastMessage.sequence,
      userId
    );
    await appRedis.expire(`delivered:${conversationId}`, 7 * 24 * 60 * 60);
  }

  // ✅ Track user as subscribed (for implicit delivery tracking)
  await appRedis.sadd(`subscriptions:${conversationId}`, userId);

  // Success Response
  socket.send(
    createSuccessFrame(undefined, "chat:subscribe-success", {
      conversationId,
      conversationType,
    })
  );
};
