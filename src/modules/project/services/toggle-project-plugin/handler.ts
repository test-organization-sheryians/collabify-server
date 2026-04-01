/**
 * toggleProjectPlugin — Service Handler
 *
 * Auth:
 *   - assertWorkspaceMember + assertProjectMember
 *   - permissions.assert("project:manage", scope)
 *
 * Steps:
 *   1. Auth gate — workspace + project membership + permission
 *   2. Enable: upsert ProjectPlugin row. Disable: delete ProjectPlugin row.
 *   3. Invalidate project cache in Redis
 *   4. Fanout `project.plugin.updated` event to all project members
 */
import { createLogger } from '@/shared/lib/logger'
import { AppError } from '@/shared/errors'
import type { ServiceContext } from '@/graphql/types'
import type { ToggleProjectPluginInput } from './types'

const logger = createLogger('project:services:toggle-project-plugin')

export const toggleProjectPlugin = async (
  input: ToggleProjectPluginInput,
  ctx: ServiceContext
): Promise<boolean> => {
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized()

  const { projectId, workspaceId, type, enable } = input

  const scope = { type: 'project' as const, id: projectId, workspaceId }
  await Promise.all([
    ctx.authGate.assertWorkspaceMember(workspaceId),
    ctx.authGate.assertProjectMember(projectId),
    ctx.permissions.assert('project:update', scope),
  ])

  if (enable) {
    // Upsert — safe to call if already enabled
    await ctx.db.projectPlugin.upsert({
      where: { projectId_type: { projectId, type } },
      create: { projectId, type, isSystem: false },
      update: {},
    })
    logger.info('Plugin enabled', { projectId, type })
  } else {
    // Hard delete — plugin row removal = disabled
    await ctx.db.projectPlugin.deleteMany({
      where: { projectId, type },
    })
    logger.info('Plugin disabled', { projectId, type })
  }

  // No Redis auth-cache invalidation needed — ProjectPlugin rows are the source
  // of truth and are read directly from DB by assertPluginActive().

  // Fanout the plugin.updated event to all current project members
  // so active users get real-time nav updates without a page refresh
  const members = await ctx.db.projectMember.findMany({
    where: { projectId },
    select: { userId: true },
  })

  await Promise.all(
    members.map((member) =>
      ctx.redis.publish(
        `user:${member.userId}:events`,
        JSON.stringify({
          type: 'project.plugin.updated',
          payload: { projectId, pluginType: type, enabled: enable },
        })
      )
    )
  )

  return true
}
