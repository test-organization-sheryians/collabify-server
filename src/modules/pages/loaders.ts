import DataLoader from "dataloader";
import { db } from "@/infra/db";

/**
 * Pages DataLoaders
 *
 * Batches and caches DB lookups for field resolvers:
 * - Page.collaborators → collaboratorsByPageId
 * - Page.creator       → userById
 *
 * Mirrors the whiteboard loaders pattern exactly.
 * Each loader is created once per GraphQL request (via createPageLoaders in context.ts).
 */

// ── Types shared with resolvers.ts ────────────────────────────────────────────

export type PageCollaboratorWithUser = {
  userId: string;
  role: string;
  joinedAt: Date;
  user: {
    id: string;
    fullName: string | null;
    email: string;
    avatarUrl: string | null;
  };
};

// ── Loader factories ──────────────────────────────────────────────────────────

const createCollaboratorsByPageIdLoader = () =>
  new DataLoader<string, PageCollaboratorWithUser[]>(async (pageIds) => {
    const collaborators = await db.pageCollaborator.findMany({
      where: { pageId: { in: [...pageIds] } },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
      },
    });

    const grouped = new Map<string, PageCollaboratorWithUser[]>();
    for (const collab of collaborators) {
      const list = grouped.get(collab.pageId) ?? [];
      list.push(collab);
      grouped.set(collab.pageId, list);
    }

    return pageIds.map((id) => grouped.get(id) ?? []);
  });

const createUserByIdLoader = () =>
  new DataLoader<
    string,
    {
      id: string;
      fullName: string | null;
      email: string;
      avatarUrl: string | null;
    } | null
  >(async (userIds) => {
    const users = await db.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, fullName: true, email: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    return userIds.map((id) => userMap.get(id) ?? null);
  });

// ── Public API ────────────────────────────────────────────────────────────────

export const createPageLoaders = () => ({
  collaboratorsByPageId: createCollaboratorsByPageIdLoader(),
  userById: createUserByIdLoader(),
});

export type PageLoaders = ReturnType<typeof createPageLoaders>;
