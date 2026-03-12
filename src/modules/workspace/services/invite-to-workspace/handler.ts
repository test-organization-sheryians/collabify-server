/**
 * inviteToWorkspace — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - assertWorkspaceAdminOrAbove — only ADMIN+ may invite
 *   - permissions.assert("workspace.member:invite") — RBAC check
 * Steps:
 *   1. [auth] assertWorkspaceAdminOrAbove + assert("workspace.member:invite") — parallel
 *   2. sendInvites — upsert invite rows, log links; return invited list
 */
import { AppError } from "@/shared/errors";
import type { InviteToWorkspaceInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import { sendInvites } from "./steps/send-invites";

export const inviteToWorkspace = async (
  input: InviteToWorkspaceInput,
  ctx: ServiceContext
) => {
  const { workspaceId, emails, actorUserId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "workspace" as const, id: workspaceId };
  await Promise.all([
    ctx.authGate.assertWorkspaceAdminOrAbove(workspaceId),
    ctx.permissions.assert("workspace.member:invite", scope),
  ]);

  const invitedEmails = await sendInvites(workspaceId, actorUserId, emails, db);

  return {
    success: true,
    message: `Invites sent to ${invitedEmails.length} users.`,
    invitedCount: invitedEmails.length,
  };
};
