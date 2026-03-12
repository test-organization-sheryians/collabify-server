import {
  WSHandlerContext,
  ChatWebSocket,
  createSuccessFrame,
} from "@/infra/ws/types";
import { SyncReactionsInput } from "./schema";
import { syncReactionEvents } from "@/modules/chat/domain/reactions/redis-helpers";

export const syncReactionsHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: SyncReactionsInput
) => {
  const { conversationId, lastEventId } = input;

  // Auth gate
  if (!ctx.authGate) return;
  try {
    await ctx.authGate.assertChannelMember(conversationId);
  } catch {
    return; // silently drop — WS event, no frame needed
  }

  const events = await syncReactionEvents(
    ctx.redis,
    conversationId,
    lastEventId
  );

  socket.send(
    createSuccessFrame(undefined, "chat:reactions-delta", {
      events,
      nextEventId: events[events.length - 1]?.eventId || lastEventId,
    })
  );
};
