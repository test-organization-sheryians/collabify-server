/**
 * Step 1 — Auth Check
 *
 * DB collaborator lookup + deleted-page guard.
 * Sends an error frame directly on the socket and returns false on failure
 * (does NOT throw — matches the existing pattern where subscribe errors
 * are per-event frames, not connection-level errors).
 *
 * Archived pages are allowed — read-only enforcement is in page-update.
 */

import { createErrorFrame } from "@/infra/ws/types";
import { createLogger } from "@/shared/lib/logger";
import type { PrismaClient } from "@prisma/client";
import type { ChatWebSocket } from "@/infra/ws/types";

const logger = createLogger("pages:ws:subscribe-page:auth-check");

export async function authCheck(
  pageId: string,
  userId: string,
  socket: ChatWebSocket,
  db: PrismaClient
): Promise<boolean> {
  const collaborator = await db.pageCollaborator.findFirst({
    where: { pageId, userId },
    select: {
      id: true,
      page: {
        select: { id: true, deletedAt: true, isArchived: true },
      },
    },
  });

  if (!collaborator) {
    logger.warn("Auth failed — not a collaborator", { pageId, userId });
    socket.send(
      createErrorFrame(
        undefined,
        "page:subscribe-error",
        "FORBIDDEN",
        "Not a collaborator on this page"
      )
    );
    return false;
  }

  if (collaborator.page.deletedAt) {
    logger.warn("Auth failed — page deleted", { pageId, userId });
    socket.send(
      createErrorFrame(
        undefined,
        "page:subscribe-error",
        "NOT_FOUND",
        "Page has been deleted"
      )
    );
    return false;
  }

  return true;
}
