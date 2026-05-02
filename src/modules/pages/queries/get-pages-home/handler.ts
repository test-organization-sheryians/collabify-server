/**
 * getPagesHome — Query Handler
 *
 * Returns pages the authenticated user can access (creator or collaborator),
 * ordered by most recently updated. Archived pages are excluded.
 *
 * Execution:
 *   Step 1 — auth guard
 *   Step 2 — fetchPages : pages ordered by updatedAt DESC
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetPagesHomeInput } from "./schema";
import { fetchRecentPages } from "./steps/fetch-recent-pages";

const logger = createLogger("pages:queries:get-pages-home");

interface PageHomeItem {
  id: string;
  title: string;
  emojiIcon: string | null;
  updatedAt: string;
  createdByName: string;
}

const toPageHomeItem = (page: {
  id: string;
  title: string | null;
  emojiIcon: string | null;
  updatedAt: Date;
  creator: { fullName: string | null } | null;
}): PageHomeItem => ({
  id: page.id,
  title: page.title ?? "Untitled",
  emojiIcon: page.emojiIcon,
  updatedAt: page.updatedAt.toISOString(),
  createdByName: page.creator?.fullName ?? "Unknown",
});

export const getPagesHomeHandler = async (
  input: GetPagesHomeInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    const { workspaceId, projectId, limit } = input;
    const pages = await fetchRecentPages(userId, workspaceId, projectId, limit, ctx);

    return {
      pages: pages.map(toPageHomeItem),
    };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to get pages home", {
      err: error,
      userId,
    });
    throw new AppError("Failed to fetch pages home");
  }
};
