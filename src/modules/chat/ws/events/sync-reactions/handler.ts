import { logger } from "@/shared/logger";
import { ChatDownstreamEvent } from "@/shared/contracts/chat/events";
import {
  WSHandlerContext,
  GenericWebSocket,
  createSuccessFrame,
} from "@/infra/ws/core/types";
import { SyncReactionsInput } from "./schema";
import { syncReactionEvents } from "@/modules/chat/domain/reactions/redis-helpers";

export const syncReactionsHandler = async (
  ctx: WSHandlerContext,
  socket: GenericWebSocket,
  input: SyncReactionsInput
) => {
  const { conversationId, lastEventId } = input;

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
