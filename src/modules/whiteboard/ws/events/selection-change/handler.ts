import { WSHandlerContext } from "@/infra/ws/types";
import { ChatWebSocket } from "@/infra/ws/types";
import { SelectionChangeInput } from "./schema";
import { logger } from "@/shared/logger";

/**
 * Selection Change Handler (EPHEMERAL)
 *
 * User selects elements on board
 */
export const selectionChangeHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: SelectionChangeInput
) => {
  const { boardId, elementIds } = input;
  const { userId } = socket.data;

  try {
    // TODO: V4 Architecture - Selection Change (Ephemeral)
    // ============================================
    //
    // STEP 1: Validate Subscription
    // -----------------------------
    // - Check user in ZSET: board:{boardId}:subscribers
    //
    // STEP 2: Broadcast via Pub/Sub
    // -----------------------------
    // - Channel: board:{boardId}:selections
    // - PUBLISH board:{boardId}:selections ${JSON.stringify({
    //     type: "whiteboard:selection-update",
    //     data: { boardId, userId, elementIds, timestamp }
    //   })}
    //
    // STEP 3: Cache Selection (Optional)
    // ----------------------------------
    // - HSET board:{boardId}:selection:{userId} elements ${JSON.stringify(elementIds)}
    // - EXPIRE board:{boardId}:selection:{userId} 10 (10sec TTL)
    // - Used for "User X is editing Element Y" UI
    //
    // ============================================
    // No-op - implement later
  } catch (err: unknown) {
    logger.error({ err, boardId }, "Failed to process selection change");
  }
};
