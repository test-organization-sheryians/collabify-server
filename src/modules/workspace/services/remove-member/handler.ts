/**
 * removeMember — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchMembers           — load actor + target; throw NOT_FOUND if target missing
 *   2. verifyRemovePermission — assert isSelf || isOwner; throw FORBIDDEN if not
 *   3. guardLastOwner         — if target is OWNER, assert not the last one
 *   4. deleteMember           — delete workspaceMember record
 */
import type { RemoveMemberInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import { fetchMembers } from "./steps/fetch-members";
import { verifyRemovePermission } from "./steps/verify-remove-permission";
import { guardLastOwner } from "./steps/guard-last-owner";
import { deleteMember } from "./steps/delete-member";

export const removeMember = async (
  input: RemoveMemberInput,
  ctx: ServiceContext
) => {
  const { workspaceId, memberId, actorUserId } = input;
  const { db } = ctx;

  const { actorMember, targetMember } = await fetchMembers(
    workspaceId,
    memberId,
    actorUserId,
    db
  );

  verifyRemovePermission(actorMember, targetMember, actorUserId);
  await guardLastOwner(workspaceId, targetMember, db);
  await deleteMember(memberId, db);

  return { success: true, message: "Member removed", invitedCount: 0 };
};
