/**
 * updateProjectMemberRole — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. verifyActorIsProjectManager — FORBIDDEN if actor cannot manage project
 *   2. setProjectMemberRole        — update roleId; NOT_FOUND if member or role missing
 */
import type { UpdateProjectMemberRoleInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { verifyActorIsProjectManager } from "./steps/verify-actor-is-project-manager";
import { setProjectMemberRole } from "./steps/set-project-member-role";

export const updateProjectMemberRole = async (
  input: UpdateProjectMemberRoleInput,
  ctx: ServiceContext
) => {
  const { projectId, workspaceId, actorUserId, targetUserId, roleId } = input;
  const { db } = ctx;

  await verifyActorIsProjectManager(projectId, workspaceId, actorUserId, db);
  return setProjectMemberRole(projectId, targetUserId, roleId, db);
};
