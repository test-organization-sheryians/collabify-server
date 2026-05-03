/**
 * enforce-workspace-guest-ceiling.ts
 *
 * Workspace GUEST Ceiling Rule:
 *   A user with a workspace role of rank <= 10 (GUEST) can NEVER be assigned
 *   a project role with rank > 10 (Contributor or Manager).
 *
 * For `addProjectMember`: silently substitutes with the project GUEST role id.
 * For `updateProjectMemberRole`: caller should throw FORBIDDEN instead.
 *
 * Returns the effective roleId to use (either the original or the GUEST fallback).
 */
import type { PrismaClient } from "@prisma/client";
import { AppError } from "@/shared/errors";

const GUEST_RANK_CEILING = 10;

/**
 * Resolves the effective project role for a user, enforcing the workspace GUEST ceiling.
 *
 * @param workspaceId - The workspace context
 * @param targetUserId - The user being added/updated
 * @param requestedRoleId - The project role id requested (null = use project GUEST default)
 * @param db - Prisma client
 * @param opts.mode - "add" (silently substitute) or "update" (throw FORBIDDEN)
 * @returns effective project role id (or null to use DB default)
 */
export async function enforceWorkspaceGuestCeiling(
  workspaceId: string,
  targetUserId: string,
  requestedRoleId: string | null | undefined,
  db: PrismaClient,
  opts: { mode: "add" | "update" } = { mode: "add" }
): Promise<string | null> {
  // If no specific role requested, no ceiling check needed
  if (!requestedRoleId) return null;

  // Fetch target user's workspace role rank
  const member = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: targetUserId },
    select: {
      assignedRole: {
        select: { rank: true },
      },
    },
  });

  if (!member) return requestedRoleId; // not a workspace member — let the next step handle the error

  const workspaceRoleRank = member.assignedRole?.rank ?? GUEST_RANK_CEILING;

  // If user is NOT a workspace guest, no ceiling applies
  if (workspaceRoleRank > GUEST_RANK_CEILING) return requestedRoleId;

  // User IS a workspace guest — check the requested project role rank
  const requestedRole = await db.role.findFirst({
    where: { id: requestedRoleId, workspaceId },
    select: { rank: true, name: true },
  });

  if (!requestedRole) return requestedRoleId; // role not found — let create step handle the error

  // If the requested project role doesn't exceed the ceiling, it's fine
  if (requestedRole.rank <= GUEST_RANK_CEILING) return requestedRoleId;

  // CEILING EXCEEDED
  if (opts.mode === "update") {
    throw AppError.forbidden(
      "Cannot elevate a workspace Guest to Contributor or Manager. " +
        "Upgrade the user's workspace role first."
    );
  }

  // mode "add": silently substitute with project GUEST role
  const guestRole = await db.role.findFirst({
    where: { workspaceId, scopeType: "PROJECT", name: "GUEST" },
    select: { id: true },
  });

  // Return guest role id if found, otherwise null (let DB handle the default)
  return guestRole?.id ?? null;
}
