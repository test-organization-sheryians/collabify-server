/**
 * Step 1 — Cleanup Presence
 *
 * UNSUBSCRIBE_CLEANUP_SCRIPT (Lua, 1 RTT):
 *   ZREM page:{id}:subscribers userId
 *   ZCARD → if 0 → ZREM sys:pages:active pageId
 *   Returns 1 if page was deactivated (last subscriber left), 0 otherwise.
 *
 * WHY LUA: ZREM + ZCARD + conditional ZREM must be atomic. Without it, two
 * concurrent unsubscribes could both see ZCARD=1 and both try to remove the
 * page from active set (harmless duplicate), BUT the real risk is a subscribe
 * racing between ZREM and ZCARD causing premature deactivation.
 */

import { createLogger } from "@/shared/lib/logger";
import { PageKeys } from "../../../../infra/page-keys";
import { UNSUBSCRIBE_CLEANUP_SCRIPT } from "../../../../infra/lua/cleanup";
import type { Redis } from "ioredis";

const logger = createLogger("pages:ws:unsubscribe-page:cleanup-presence");

export async function cleanupPresence(
  pageId: string,
  userId: string,
  redis: Redis
): Promise<number> {
  try {
    const deactivated = (await redis.eval(
      UNSUBSCRIBE_CLEANUP_SCRIPT,
      2,
      PageKeys.PageSubscribers(pageId),
      PageKeys.SysActivePages(),
      userId,
      pageId
    )) as number;

    logger.info("Presence cleanup complete", {
      pageId,
      userId,
      pageDeactivated: deactivated === 1,
    });

    return deactivated;
  } catch (err) {
    logger.error("Lua cleanup failed — continuing best-effort", {
      pageId,
      userId,
      err,
    });
    return 0;
  }
}
