/**
 * DataLoader: collaboratorsByPageId
 *
 * Batches DB calls for the Page.collaborators field resolver.
 * Without DataLoader, fetching N pages would fire N queries for collaborator data.
 * With DataLoader, all N pageIds are batched into one WHERE IN query.
 */

import DataLoader from "dataloader";
import { db } from "@/infra/db";

/**
 * Creates a per-request DataLoader that batches PageCollaborator lookups by pageId.
 *
 * Returns an array of arrays — each entry is the collaborator list for that pageId.
 * If a pageId has no collaborators, return [] (not null and not an error).
 *
 * TODO: Implement batchFn
 * async (pageIds: readonly string[]) => {
 *   const collaborators = await db.pageCollaborator.findMany({
 *     where: { pageId: { in: [...pageIds] } },
 *     include: { user: true },
 *   })
 *   // Group by pageId
 *   const grouped = new Map<string, typeof collaborators>()
 *   for (const collab of collaborators) {
 *     const existing = grouped.get(collab.pageId) ?? []
 *     existing.push(collab)
 *     grouped.set(collab.pageId, existing)
 *   }
 *   // Return in input order (missing = empty array)
 *   return pageIds.map(id => grouped.get(id) ?? [])
 * }
 */
export function createCollaboratorsByPageIdLoader() {
  // TODO: return new DataLoader<string, PrismaPageCollaborator[]>(...)
  throw new Error("createCollaboratorsByPageIdLoader: not implemented");
}
