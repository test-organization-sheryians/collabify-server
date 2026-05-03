/**
 * getInviteInfo — Query Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchInvite        — load invite + workspace; throw NOT_FOUND if missing/expired
 *   2. verifyInviteEmail  — if userEmail provided, assert match; throw FORBIDDEN if not
 *   3. checkAlreadyMember — if userId provided, throw CONFLICT if already a member
 */
import type { GetInviteInfoInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import { fetchInvite } from "./steps/fetch-invite";
import { verifyInviteEmail } from "./steps/verify-invite-email";
import { checkAlreadyMember } from "./steps/check-already-member";

export const getInviteInfo = async (
  input: GetInviteInfoInput,
  ctx: ServiceContext
) => {
  const { token, userId, userEmail } = input;
  const { db } = ctx;

  const invite = await fetchInvite(token, db);
  verifyInviteEmail(invite.email, userEmail);
  await checkAlreadyMember(invite.workspaceId, userId, db);

  return {
    workspaceName: invite.workspace.name,
    workspaceLogoUrl: invite.workspace.logoS3Key,
    inviterName: "Workspace Admin",
  };
};
