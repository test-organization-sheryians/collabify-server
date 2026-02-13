import { WSHandlerContext } from "@/infra/ws/types";
import { ChatWebSocket } from "@/infra/ws/types";
import { PointerDownInput } from "./schema";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("whiteboard:ws:cursor");

/**
 * Pointer Down Handler (PRESENCE)
 *
 * User starts drawing/interacting
 */
export const pointerDownHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: PointerDownInput
) => {
  const { boardId } = input;
  const { userId } = socket.data;

  try {
    // TODO: V4 Architecture - Pointer Down (Presence)
    // ============================================
    //
    // STEP 1: Update Presence State (Redis)
    // -------------------------------------
    // - HSET board:{boardId}:user:{userId}:state isDrawing true
    // - EXPIRE board:{boardId}:user:{userId}:state 30 (30sec TTL)
    //
    // STEP 2: Broadcast Presence Update
    // ---------------------------------
    // - PUBLISH board:{boardId}:presence ${JSON.stringify({
    //     type: "whiteboard:presence-update",
    //     data: { boardId, userId, isDrawing: true, timestamp }
    //   })}
    //
    // ============================================
    // No-op - implement later
  } catch (err: unknown) {
    logger.error("Failed to process pointer down", { err, boardId });
  }
};
