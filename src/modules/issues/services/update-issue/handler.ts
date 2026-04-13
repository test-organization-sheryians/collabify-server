/**
 * updateIssue — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchIssue           — load issue lean (get projectId)
 *   2. getProject           — cache-backed fetch for workspaceId
 *   3. assertProjectMember  — auth gate (cache-backed)
 *   4. assert issue:update  — RBAC permission check (cache-backed)
 *   5. validateLabels       — all labelIds belong to project
 *   6. updateIssue          — patch fields + sync labels
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { UpdateIssueInput } from "./schema";
import type { UpdateIssueResult } from "./types";
import { fetchIssue } from "./steps/fetch-issue";
import { validateLabels } from "./steps/validate-labels";
import { updateIssue } from "./steps/update-issue";
import { emit } from "@/modules/notification/outbox/outbox-writer";

const logger = createLogger("issues:services:update-issue");

export const updateIssueHandler = async (
  input: UpdateIssueInput,
  ctx: ServiceContext
): Promise<UpdateIssueResult> => {
  const { userId } = ctx.auth;
  if (!userId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated.");
  }

  logger.debug("updateIssue started", { userId, issueId: input.issueId });

  const existing = await fetchIssue(input.issueId, ctx.db);
  const project = await ctx.authGate.getProject(existing.projectId);
  if (!project) throw AppError.notFound("Project not found.");

  const scope = {
    type: "project" as const,
    id: existing.projectId,
    workspaceId: project.workspaceId,
  };

  await Promise.all([
    ctx.authGate.assertProjectMember(existing.projectId),
    ctx.permissions.assert("issue:update", scope),
  ]);

  await validateLabels(input.labelIds, existing.projectId, ctx.db);
  const issue = await updateIssue(input, ctx.db);

  // Emit outbox events only for meaningful changes
  const notifications: Promise<void>[] = [];

  // Assignee changed and new assignee ≠ actor → issue.assigned
  const assigneeChanged =
    input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId;
  if (assigneeChanged && input.assigneeId && input.assigneeId !== userId) {
    notifications.push(
      emit(ctx.db as any, {
        type: "issue.assigned",
        payload: {
          issueId:     issue.id,
          issueTitle:  issue.title ?? "Untitled",
          issueNumber: issue.number ?? 0,
          projectId:   existing.projectId,
          projectName: project.name ?? "",
          workspaceSlug: project.slug ?? "",
          assigneeId:  input.assigneeId,
          actorId:     userId,
          actorName:   "Someone",
        } as any,
        deduplicationId: `issue.assigned:${issue.id}:${input.assigneeId}:${Date.now()}`,
      }).catch(() => { /* non-fatal */ })
    );
  }

  // Status changed → issue.status.changed (notify assignee if any, ≠ actor)
  const statusChanged =
    input.statusId !== undefined && input.statusId !== existing.statusId;
  if (statusChanged && issue.assigneeId && issue.assigneeId !== userId) {
    notifications.push(
      emit(ctx.db as any, {
        type: "issue.status.changed",
        payload: {
          issueId:     issue.id,
          issueTitle:  issue.title ?? "Untitled",
          issueNumber: issue.number ?? 0,
          projectId:   existing.projectId,
          projectName: project.name ?? "",
          workspaceSlug: project.slug ?? "",
          assigneeId:  issue.assigneeId,
          actorId:     userId,
          actorName:   "Someone",
          oldStatus:   existing.statusId ?? "",
          newStatus:   input.statusId ?? "",
        } as any,
      }).catch(() => { /* non-fatal */ })
    );
  }

  // Priority changed → issue.priority.changed
  if (input.priority && input.priority !== (existing as any).priority) {
    notifications.push(
      emit(ctx.db as any, {
        type: "issue.priority.changed",
        payload: {
          issueId:     issue.id,
          issueTitle:  issue.title ?? "Untitled",
          issueNumber: issue.number ?? 0,
          projectId:   existing.projectId,
          projectName: project.name ?? "",
          workspaceSlug: project.slug ?? "",
          assigneeId:  issue.assigneeId,
          actorId:     userId,
          actorName:   "Someone",
          oldPriority: (existing as any).priority ?? "",
          newPriority: input.priority,
        } as any,
        deduplicationId: `issue.priority.changed:${issue.id}:${Date.now()}`,
      }).catch(() => { /* non-fatal */ })
    );
  }

  // Unassigned → issue.unassigned (when assignee is removed)
  if (existing.assigneeId && input.assigneeId === null) {
    notifications.push(
      emit(ctx.db as any, {
        type: "issue.unassigned",
        payload: {
          issueId:     issue.id,
          issueTitle:  issue.title ?? "Untitled",
          issueNumber: issue.number ?? 0,
          projectId:   existing.projectId,
          projectName: project.name ?? "",
          workspaceSlug: project.slug ?? "",
          unassignedUserId: existing.assigneeId,
          actorId:     userId,
          actorName:   "Someone",
        } as any,
        deduplicationId: `issue.unassigned:${issue.id}:${existing.assigneeId}:${Date.now()}`,
      }).catch(() => { /* non-fatal */ })
    );
  }

  await Promise.all(notifications);

  logger.info("updateIssue done", { issueId: issue.id });
  return { issue };
};
