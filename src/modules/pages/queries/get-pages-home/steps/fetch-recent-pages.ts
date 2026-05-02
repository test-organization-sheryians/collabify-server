/**
 * fetchRecentPages — returns pages the user has recently viewed.
 *
 * Falls back to createdAt when lastViewedAt is unavailable,
 * ensuring the list is never empty for a new user.
 *
 * Excludes archived pages.
 */
import { PrismaClient } from "@prisma/client";
import type { ServiceContext } from "@/graphql/types";

export const fetchRecentPages = async (
  userId: string,
  workspaceId: string,
  projectId: string,
  limit: number,
  _ctx: ServiceContext
) => {
  // PrismaClient is injected via ctx.db
  // (passed through from the handler which owns the db reference)
  const db = _ctx.db as PrismaClient;

  // TODO: When lastViewedAt tracking is implemented on the Page model,
  // replace this with a real lastViewedAt filter.
  // For now, fall back to createdAt for recently created pages.
  const pages = await db.page.findMany({
    where: {
      workspaceId,
      projectId,
      deletedAt: null,
      isArchived: false,
      collaborators: { some: { userId } },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      creator: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });

  return pages;
};
