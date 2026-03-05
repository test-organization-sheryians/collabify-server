/**
 * updateMemberRole — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. verifyActorIsOwner — assert actor is OWNER; throw FORBIDDEN if not
 *   2. updateRole         — update role; return updated member with user
 */
import type { UpdateMemberRoleInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import { verifyActorIsOwner } from "./steps/verify-actor-is-owner";
import { updateRole } from "./steps/update-role";

export const updateMemberRole = async (
  input: UpdateMemberRoleInput,
  ctx: ServiceContext
) => {
  const { workspaceId, memberId, role, actorUserId } = input;
  const { db } = ctx;

  await verifyActorIsOwner(workspaceId, actorUserId, db);
  return updateRole(memberId, workspaceId, role, db);
};
