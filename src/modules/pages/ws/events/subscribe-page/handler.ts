import {
  WSHandlerContext,
  ChatWebSocket,
  createSuccessFrame,
} from "@/infra/ws/types";
import { createLogger } from "@/shared/lib/logger";
import type { SubscribePageInput } from "./schema";

import { authCheck } from "./steps/auth-check";
import { checkLock } from "./steps/check-lock";
import { trackPresence } from "./steps/track-presence";
import { registerSocket } from "./steps/register-socket";
import { fetchCollaborators } from "./steps/fetch-collaborators";
import { replayGap } from "./steps/replay-gap";
import { broadcastJoin } from "./steps/broadcast-join";

const logger = createLogger("pages:ws:subscribe-page");

/**
 * subscribePage — WS Event Handler
 *
 * Stateless gateway — no Y.Doc, no S3, no state merging.
 * Client calls getPageSnapshot via GraphQL BEFORE subscribing.
 *
 * Execution order:
 *   1. authCheck          — DB collaborator check + deleted guard
 *   2. checkLock          — GET page:lock (informational)
 *   3. trackPresence      — PRESENCE_TRACKING_SCRIPT + PAGE_ACTIVATION_SCRIPT
 *   4. registerSocket     — wsRegistry.subscribe both channels
 *   5. fetchCollaborators — ZRANGE + user.findMany batch
 *   6. [send success]     — page:subscribe-success to this socket
 *   7. replayGap          — XRANGE gap-fill to this socket only
 *   8. broadcastJoin      — PUBLISH page:user-joined (new users only)
 *
 * See README.md for full system design.
 */
export const subscribePageHandler = async (
  ctx: WSHandlerContext,
  socket: ChatWebSocket,
  input: SubscribePageInput
) => {
  const { userId, socketId } = socket.data;
  const { pageId, lastStreamId } = input;
  const timestamp = Date.now();

  logger.info("Subscribe request", { pageId, userId });

  // 1. Auth — sends error frame + returns false on failure
  const authorized = await authCheck(pageId, userId, socket, ctx.db);
  if (!authorized) return;

  // 2. Lock status (informational — enforcement in page-update)
  const isLocked = await checkLock(pageId, ctx.redis);

  // 3. Presence tracking + page activation (if first subscriber)
  const { isNew, subscriberCount } = await trackPresence(
    pageId,
    userId,
    timestamp,
    ctx.redis
  );

  // 4. Register socket to both pub/sub channels
  await registerSocket(socketId, pageId);

  // 5. Fetch active collaborators for initial state
  const collaborators = await fetchCollaborators(pageId, ctx.redis, ctx.db);

  // 6. Subscribe success — includes lock state + active collaborators
  socket.send(
    createSuccessFrame(undefined, "page:subscribe-success", {
      pageId,
      isLocked,
      subscriberCount,
      collaborators,
    })
  );

  // 7. Replay gap (reconnect path — "0-0" is skipped inside replayGap)
  await replayGap(pageId, userId, lastStreamId, socket, ctx.redis);

  // 8. Broadcast join (new users only — not reconnects/second tabs)
  if (isNew === 1) {
    await broadcastJoin(pageId, userId, socketId, timestamp, ctx.redis, ctx.db);
  } else {
    logger.info("User reconnected — no join broadcast", { pageId, userId });
  }
};
