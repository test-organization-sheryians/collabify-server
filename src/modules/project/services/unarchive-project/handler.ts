/**
 * unarchiveProject — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - permissions.assert("project:archive") — MANAGER+ only (RBAC)
 * Steps:
 *   1. getProject — cache-backed fetch for workspaceId (needed for scope)
 *   2. [auth] assert("project:archive")
 *   3. setUnarchived — set isArchived=false; return project
 */
import { AppError } from "@/shared/errors";
import type { UnarchiveProjectInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { setUnarchived } from "./steps/set-unarchived";
import { emit } from "@/modules/notification/outbox/outbox-writer";

export const unarchiveProject = async (
  input: UnarchiveProjectInput,
  ctx: ServiceContext
) => {
  const { projectId, actorUserId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const project = await ctx.authGate.getProject(projectId);
  if (!project) throw AppError.notFound("Project not found");

  const scope = {
    type: "project" as const,
    id: projectId,
    workspaceId: project.workspaceId,
  };
  await ctx.permissions.assert("project:archive", scope);

  const unarchived = await setUnarchived(projectId, db);

  const [workspace, actor] = await Promise.all([
    db.workspace.findUnique({ where: { id: project.workspaceId }, select: { slug: true } }),
    db.user.findUnique({ where: { id: actorUserId }, select: { fullName: true } }),
  ]);

  const memberIds = await db.projectMember.findMany({
    where: { projectId },
    select: { userId: true },
  }).then((members) => members.map((m) => m.userId));

  await emit(db as any, {
    type: "project.unarchived",
    payload: {
      projectId,
      workspaceId: project.workspaceId,
      workspaceSlug: workspace?.slug ?? "",
      actorId: actorUserId,
      actorName: actor?.fullName ?? "Someone",
      projectName: project.name,
      memberIds,
    },
  }).catch(() => { /* non-fatal */ });

  return unarchived;
};
