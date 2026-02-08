import { WSHandlerContext } from "@/infra/ws/types";
import { ChatWebSocket } from "@/infra/ws/types";
import { PointerUpInput } from "./schema";
import { logger } from "@/shared/logger";

/**
 * Pointer Up Handler (PRESENCE)
 *
 * User stops drawing/interacting
 */
export const pointerUpHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: PointerUpInput
) => {
  const { boardId } = input;
  const { userId } = socket.data;

  try {
    // TODO: V4 Architecture - Pointer Up (Presence)
    // ============================================
    //
    // STEP 1: Update Presence State
    // -----------------------------
    // - HSET board:{boardId}:user:{userId}:state isDrawing false
    //
    // STEP 2: Broadcast Presence Update
    // ---------------------------------
    // - PUBLISH board:{boardId}:presence ${JSON.stringify({
    //     type: "whiteboard:presence-update",
    //     data: { boardId, userId, isDrawing: false, timestamp }
    //   })}
    //
    // ============================================
    // No-op - implement later
  } catch (err: unknown) {
    logger.error({ err, boardId }, "Failed to process pointer up");
  }
};
