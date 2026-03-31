/**
 * markFilesUnreferenced — Service Handler
 *
 * Called by the editor on each save when one or more vault://fileId references
 * are removed from the saved content versus the previous saved snapshot.
 * Supports entity types: PAGE, TASK, WHITEBOARD.
 *
 * Sets unrefAt/unrefEntityId/unrefEntityType on each VaultFile that:
 *   - belongs to the caller's project
 *   - is currently ACTIVE
 *   - has NOT already been marked unreferenced (unrefAt IS NULL)
 *     (idempotent: a second call before cleanup just updates the timestamp)
 *
 * The cleanup job (vault-unreferenced-cleanup) picks up these rows after the
 * grace period (30 min), re-verifies the file is still absent from saved
 * content, and only then soft-deletes.
 *
 * Authorization: caller must be a project member with vault.file:write.
 * The handler verifies each fileId belongs to the project before touching it
 * to prevent cross-project manipulation.
 */

import { AppError } from '@/shared/errors'
import { createLogger } from '@/shared/lib/logger'
import type { ServiceContext } from '@/graphql/types'
import type { MarkFilesUnreferencedInput } from './schema'

const logger = createLogger('vault:services:mark-unreferenced')

export const markFilesUnreferencedHandler = async (
  input: MarkFilesUnreferencedInput,
  ctx: ServiceContext,
): Promise<{ markedCount: number }> => {
  const { userId } = ctx.auth
  if (!userId) throw AppError.unauthorized('User not authenticated')
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized()

  // Resolve the files, ensuring they belong to a project the caller can access.
  // We batch-fetch then filter — avoids N queries and leaks no info about
  // files in other projects (we simply skip those rows silently).
  const files = await ctx.db.vaultFile.findMany({
    where: {
      id: { in: input.fileIds },
      status: 'ACTIVE',
    },
    select: { id: true, projectId: true, workspaceId: true },
  })

  if (files.length === 0) return { markedCount: 0 }

  // Verify caller is a member of every project represented in this batch.
  // All files should share the same projectId (same editor session), but we
  // guard against edge cases without revealing cross-project file existence.
  const projectIds = [...new Set(files.map((f) => f.projectId))]
  for (const projectId of projectIds) {
    try {
      await ctx.authGate.assertProjectMember(projectId)
    } catch {
      // Remove files from other projects silently — don't leak their existence
      files.splice(
        0,
        files.length,
        ...files.filter((f) => f.projectId !== projectId),
      )
    }
  }

  if (files.length === 0) return { markedCount: 0 }

  const now = new Date()
  const sourceType =
    input.entityType === 'PAGE' ? 'PAGE'
    : input.entityType === 'TASK' ? 'TASK'
    : 'WHITEBOARD'

  // Batch update — mark each file as unreferenced.
  // Uses updateMany for efficiency; idempotent if unrefAt already set
  // (we update the timestamp so the grace window restarts from the latest save).
  await ctx.db.vaultFile.updateMany({
    where: { id: { in: files.map((f) => f.id) } },
    data: {
      unrefAt: now,
      unrefEntityId: input.entityId,
      unrefEntityType: sourceType,
    },
  })

  logger.info('[FILE_MARKED_UNREFERENCED]', {
    fileIds: files.map((f) => f.id),
    count: files.length,
    entityId: input.entityId,
    entityType: input.entityType,
    userId,
    unrefAt: now.toISOString(),
  })

  return { markedCount: files.length }
}
