import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { CreatePageInput } from "./schema";
import { PageKeys, PageTTLs } from "../../infra/page-keys";

const logger = createLogger("pages:services:create-page");

/**
 * createPage handler
 *
 * Workflow (7 steps):
 * 1. Auth — userId must be present
 * 2. Workspace membership check
 * 3. Parent page validation (if parentId provided)
 * 4. Project ownership validation
 * 5. Atomic DB transaction — create Page + creator PageCollaborator
 * 6. Initialize Redis stream & consumer group (MKSTREAM)
 * 7. Return new page
 */
export const handler = async (input: CreatePageInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — Workspace membership
    // TODO: const member = await ctx.db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: input.workspaceId, userId } } })
    // TODO: if (!member) throw AppError.forbidden("You are not a member of this workspace")

    // Step 2 — Parent page check (if parentId provided)
    // TODO: if (input.parentId) {
    //   const parent = await ctx.db.page.findUnique({ where: { id: input.parentId, deletedAt: null } })
    //   if (!parent) throw AppError.badRequest("Parent page not found")
    //   if (parent.projectId !== input.projectId) throw AppError.badRequest("Parent page belongs to a different project")
    // }

    // Step 3 — Project ownership check
    // TODO: const project = await ctx.db.project.findUnique({ where: { id: input.projectId }, select: { workspaceId: true } })
    // TODO: if (!project || project.workspaceId !== input.workspaceId) throw AppError.badRequest("Invalid project")

    // Step 4 — Compute position (append to end of siblings)
    // TODO: const lastSibling = await ctx.db.page.findFirst({
    //   where: { projectId: input.projectId, parentId: input.parentId ?? null, deletedAt: null },
    //   orderBy: { position: 'desc' },
    //   select: { position: true },
    // })
    // const position = (lastSibling?.position ?? 0) + 1

    // Step 5 — Atomic transaction: create page + add creator as collaborator
    // TODO: const page = await ctx.db.$transaction(async (tx) => {
    //   const p = await tx.page.create({ data: { ...input, createdBy: userId, position } })
    //   await tx.pageCollaborator.create({ data: { pageId: p.id, userId, role: 'EDITOR' } })
    //   return p
    // })

    // Step 6 — Initialize Redis stream + consumer group
    // TODO: const streamKey = PageKeys.PageStream(page.id)
    // try {
    //   await ctx.redis.xgroup('CREATE', streamKey, 'page-workers', '0', 'MKSTREAM')
    // } catch (err) {
    //   const e = err as Error
    //   if (!e.message?.includes('BUSYGROUP')) throw err
    // }

    // Step 7 — Log + return
    // logger.info("Page created", { pageId: page.id, projectId: input.projectId, userId })
    // return { page }

    throw new AppError("createPage: not yet implemented", "INTERNAL_SERVER_ERROR");
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to create page", { err: error, userId, input });
    throw new AppError("Failed to create page");
  }
};
