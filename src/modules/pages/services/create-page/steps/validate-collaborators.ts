/**
 * Step: Validate Collaborators
 *
 * Takes the raw collaboratorIds from input and returns only the valid subset:
 * - Deduplicates the list
 * - Removes the creator (they're added automatically as EDITOR in the transaction)
 * - Batch-checks that remaining IDs are workspace members
 * - Invalid IDs are silently dropped with a warn log (graceful degradation)
 *
 * Returns an empty array if no valid additional collaborators exist.
 */

import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { CreatePageInput } from "../schema";

const logger = createLogger("pages:services:create-page");

export async function validateCollaborators(
  input: CreatePageInput,
  ctx: ServiceContext,
  userId: string
): Promise<string[]> {
  if (!input.collaboratorIds || input.collaboratorIds.length === 0) return [];

  // Deduplicate and remove the creator — they're added separately as EDITOR
  const candidates = Array.from(
    new Set(input.collaboratorIds.filter((id) => id !== userId))
  );
  if (candidates.length === 0) return [];

  // Batch workspace-member check
  const members = await ctx.db.workspaceMember.findMany({
    where: { workspaceId: input.workspaceId, userId: { in: candidates } },
    select: { userId: true },
  });

  const validIds = members.map((m) => m.userId);

  // Warn about skipped IDs — never fail the mutation for them
  const invalidIds = candidates.filter((id) => !validIds.includes(id));
  if (invalidIds.length > 0) {
    logger.warn("Some collaboratorIds are not workspace members — skipped", {
      workspaceId: input.workspaceId,
      invalidIds,
    });
  }

  return validIds;
}
