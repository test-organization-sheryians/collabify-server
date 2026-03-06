/**
 * removeProjectMember — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. verifyActorIsProjectManager — FORBIDDEN if actor cannot manage project
 *   2. deleteProjectMember         — delete row; NOT_FOUND if target not a member
 */
import type { RemoveProjectMemberInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { verifyActorIsProjectManager } from "./steps/verify-actor-is-project-manager";
import { deleteProjectMember } from "./steps/delete-project-member";

export const removeProjectMember = async (
  input: RemoveProjectMemberInput,
  ctx: ServiceContext
) => {
  const { projectId, workspaceId, actorUserId, targetUserId } = input;
  const { db } = ctx;

  await verifyActorIsProjectManager(projectId, workspaceId, actorUserId, db);
  await deleteProjectMember(projectId, targetUserId, db);
  return true;
};
