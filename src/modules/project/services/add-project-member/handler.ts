/**
 * addProjectMember — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. verifyActorIsProjectManager      — FORBIDDEN if actor cannot manage project
 *   2. verifyTargetIsWorkspaceMember    — BAD_REQUEST if target not in workspace
 *   3. createProjectMember              — create row; CONFLICT if already member
 */
import type { AddProjectMemberInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { verifyActorIsProjectManager } from "./steps/verify-actor-is-project-manager";
import { verifyTargetIsWorkspaceMember } from "./steps/verify-target-is-workspace-member";
import { createProjectMember } from "./steps/create-project-member";

export const addProjectMember = async (
  input: AddProjectMemberInput,
  ctx: ServiceContext
) => {
  const { projectId, workspaceId, actorUserId, targetUserId } = input;
  const { db } = ctx;

  await verifyActorIsProjectManager(projectId, workspaceId, actorUserId, db);
  await verifyTargetIsWorkspaceMember(workspaceId, targetUserId, db);
  return createProjectMember(projectId, workspaceId, targetUserId, db);
};
