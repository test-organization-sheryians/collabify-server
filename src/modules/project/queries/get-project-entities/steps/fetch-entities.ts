/**
 * Step: Fetch Entities
 *
 * Parallel fetch of all taggable entity types within a project:
 * - Pages (non-archived, non-deleted)
 * - Issues (all statuses)
 * - Vault files (active)
 * - Vault folders (active)
 * - Whiteboards (non-archived)
 * - Project members
 */
import type { ServiceContext } from "@/graphql/types";
import type { SearchEntity } from "../types";

interface RawEntities {
  pages: Array<{ id: string; title: string }>;
  issues: Array<{ id: string; title: string }>;
  vaultFiles: Array<{ id: string; name: string }>;
  vaultFolders: Array<{ id: string; name: string }>;
  whiteboards: Array<{ id: string; title: string }>;
  users: Array<{ id: string; fullName: string }>;
}

export async function fetchEntities(
  projectId: string,
  ctx: ServiceContext
): Promise<RawEntities> {
  const { db } = ctx;

  const [pages, issues, vaultFiles, vaultFolders, whiteboards, members] = await Promise.all([
    db.page.findMany({
      where: {
        projectId,
        isArchived: false,
        deletedAt: null,
      },
      select: { id: true, title: true },
    }),
    db.issue.findMany({
      where: { projectId },
      select: { id: true, title: true },
    }),
    db.vaultFile.findMany({
      where: {
        projectId,
        status: "ACTIVE",
        deletedAt: null,
      },
      select: { id: true, name: true },
    }),
    db.vaultFolder.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
      select: { id: true, name: true },
    }),
    db.whiteboard.findMany({
      where: {
        projectId,
        isArchived: false,
        deletedAt: null,
      },
      select: { id: true, title: true },
    }),
    db.projectMember.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, fullName: true } },
      },
    }),
  ]);

  return {
    pages,
    issues,
    vaultFiles,
    vaultFolders,
    whiteboards,
    users: members.map((m) => ({
      id: m.user.id,
      fullName: m.user.fullName ?? "Unknown",
    })),
  };
}
