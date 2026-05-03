/**
 * inviteToWorkspace — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - permissions.assert("workspace:member:invite") — ADMIN+ only (RBAC)
 * Steps:
 *   1. [auth] assert("workspace:member:invite")
 *   2. sendInvites — upsert invite rows with roleId, log links; return invited list
 *      Note: Email sending is best-effort — invite creation succeeds regardless of email delivery
 */
import { AppError } from "@/shared/errors";
import type { InviteToWorkspaceInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import { sendInvites } from "./steps/send-invites";

export const inviteToWorkspace = async (
  input: InviteToWorkspaceInput,
  ctx: ServiceContext
) => {
  const { workspaceId, emails, actorUserId, roleId } = input;
  const { db } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "workspace" as const, id: workspaceId };
  await ctx.permissions.assert("workspace:member:invite", scope);

  // sendInvites returns { invitedEmails, emailFailures }
  // Email failures are logged server-side but NOT exposed to client
  // The invite row is created regardless of email delivery success
  const { invitedEmails, emailFailures } = await sendInvites(workspaceId, actorUserId, emails, roleId, db);

  return {
    success: true,
    message: `Invites sent to ${invitedEmails.length} users.`,
    invitedCount: invitedEmails.length,
  };
};
