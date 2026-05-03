import { db } from "@/infra/db";
import { createLogger } from "@/shared/lib/logger";
import type { Recipient } from "../../events/types";

// =============================================================================
// Fan-out Cursor
//
// For very large fan-outs (1000+ recipients), loading all recipients into
// memory at once risks OOM and query timeouts.
//
// The FanoutWorker calls this when a FanoutJobData has a nextCursor set.
// It fetches the next page of workspace/project members and dispatches
// another FanoutQueue chunk, until nextCursor is null (last page).
//
// Caller is responsible for mapping DB rows to Recipient shape.
// =============================================================================

const logger = createLogger("notification:shared:fanout-cursor");

export type FanoutEntityType = "workspace" | "project" | "channel";

export interface FanoutPage {
  recipients: Recipient[];
  /** Cursor to pass to the next page call. Null when this is the last page. */
  nextCursor: string | null;
}

const PAGE_SIZE = 50;

/**
 * Fetch the next page of recipients for a fan-out.
 * Uses cursor-based pagination to avoid OFFSET performance problems.
 */
export async function nextPage(
  entityType: FanoutEntityType,
  entityId:   string,
  cursor:     string | null,
  limit:      number = PAGE_SIZE
): Promise<FanoutPage> {
  logger.debug("Fan-out cursor: loading next page", { entityType, entityId, cursor });

  if (entityType === "workspace") {
    const members = await db.workspaceMember.findMany({
      where:   { workspaceId: entityId },
      take:    limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: "asc" },
      select:  { userId: true, user: { select: { email: true } } },
    });

    const hasMore = members.length > limit;
    const page    = hasMore ? members.slice(0, limit) : members;
    const next    = hasMore ? page[page.length - 1]?.userId ?? null : null;

    return {
      recipients: page.map((m) => ({ userId: m.userId, email: m.user?.email ?? null })),
      nextCursor: next,
    };
  }

  if (entityType === "project") {
    const members = await db.projectMember.findMany({
      where:   { projectId: entityId },
      take:    limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: "asc" },
      select:  { userId: true, user: { select: { email: true } } },
    });

    const hasMore = members.length > limit;
    const page    = hasMore ? members.slice(0, limit) : members;
    const next    = hasMore ? page[page.length - 1]?.userId ?? null : null;

    return {
      recipients: page.map((m) => ({ userId: m.userId, email: m.user?.email ?? null })),
      nextCursor: next,
    };
  }

  // channel: query ChatMember
  const members = await db.chatMember.findMany({
    where:   { conversationId: entityId },
    take:    limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { id: "asc" },
    select:  { userId: true, user: { select: { email: true } } },
  });

  const hasMore = members.length > limit;
  const page    = hasMore ? members.slice(0, limit) : members;
  const next    = hasMore ? page[page.length - 1]?.userId ?? null : null;

  return {
    recipients: page.map((m) => ({ userId: m.userId, email: m.user?.email ?? null })),
    nextCursor: next,
  };
}
