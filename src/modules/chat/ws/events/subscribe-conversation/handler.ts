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

            // Only new-message entries carry a sequence number.
            // Edit/delete/reaction entries have no sequence field — parseInt returns NaN.
            // Skipping them prevents false-positive isTruncated detection:
            // without this skip, the first edit/delete entry in the stream would
            // set foundAll=true (NaN > N = false → else branch) even though we
            // haven't found the actual sequence boundary yet.
            const entryType = data.type as string | undefined;
            if (entryType && entryType !== "chat:new-message") {
              continue; // not a sequenced entry — skip, keep searching
            }

            const seq = parseInt(data.sequence, 10);
            if (isNaN(seq)) {
              // Sequence field present but unparseable — skip defensively
              continue;
            }

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
              // Found an entry at or before lastSequence — we have full coverage.
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
    // Pipeline zadd + expire into a single Redis round-trip
    const pipeline = appRedis.pipeline();
    pipeline.zadd(`delivered:${conversationId}`, lastMessage.sequence, userId);
    pipeline.expire(`delivered:${conversationId}`, 7 * 24 * 60 * 60);
    await pipeline.exec();
  }

  // ✅ Track user as subscribed (for implicit delivery tracking)
  await appRedis.sadd(`subscriptions:${conversationId}`, userId);

  // ── Mutation Delta (Offline Gap Sync) ──────────────────────────────────
  // Replays edit/delete events missed while the client was offline.
  // Only runs when the client sends lastOpenedAt (new clients only).
  // Old clients without lastOpenedAt skip this block safely.
  if (input.lastOpenedAt) {
    const since = new Date(input.lastOpenedAt);
    const MUTATION_CAP = 200;

    // Run both queries in parallel — they are fully independent.
    const [deletedMessages, editedMessages] = await Promise.all([
      // 1. Messages deleted since the client was last connected
      ctx.db.chatMessage.findMany({
        where: {
          conversationId,
          deletedAt: { gt: since },
        },
        select: {
          id: true,
          authorUserId: true,
          deletedAt: true,
        },
        orderBy: { deletedAt: "asc" },
        take: MUTATION_CAP,
      }),
      // 2. Messages edited since the client was last connected
      // Exclude deleted messages (they are handled by the delete replay above).
      ctx.db.chatMessage.findMany({
        where: {
          conversationId,
          isEdited: true,
          editedAt: { gt: since },
          deletedAt: null,
        },
        select: {
          id: true,
          authorUserId: true,
          content: true,
          editedAt: true,
        },
        orderBy: { editedAt: "asc" },
        take: MUTATION_CAP,
      }),
    ]);

    // Overflow: too many mutations to replay safely — force a full sync.
    // Check both results before sending anything so the client gets a clean signal.
    if (deletedMessages.length >= MUTATION_CAP || editedMessages.length >= MUTATION_CAP) {
      socket.send(
        createSuccessFrame(undefined, "chat:sync-required", {
          conversationId,
          reason: "mutation_delta_overflow",
        })
      );
    } else {
      for (const msg of deletedMessages) {
        socket.send(
          createSuccessFrame(undefined, "chat:message-deleted", {
            messageId: msg.id,
            conversationId,
            deletedAt: msg.deletedAt!.toISOString(),
            authorId: msg.authorUserId,
          })
        );
      }

      for (const msg of editedMessages) {
        // content is stored as Json { text, schemaVersion } — extract text safely
        const rawContent = msg.content as Record<string, unknown> | null;
        const safeContent =
          rawContent && typeof rawContent.text === "string"
            ? rawContent.text
            : String(rawContent ?? "");

        socket.send(
          createSuccessFrame(undefined, "chat:message-edited", {
            messageId: msg.id,
            conversationId,
            content: safeContent,
            editedAt: msg.editedAt!.toISOString(),
            isEdited: true,
            editorUserId: msg.authorUserId,
            outboxId: null, // replay event — no live outbox
          })
        );
      }
    }

    if (deletedMessages.length > 0 || editedMessages.length > 0) {
      logger.info("Mutation delta sent on subscribe", {
        userId,
        conversationId,
        deletedCount: deletedMessages.length,
        editedCount: editedMessages.length,
      });
    }
  }
  // ── End Mutation Delta ──────────────────────────────────────────────────

  // Success Response
  socket.send(
    createSuccessFrame(undefined, "chat:subscribe-success", {
      conversationId,
      conversationType,
    })
  );
};
