/**
 * getWorkspaceUser — Query Handler
 *
 * Fetches a specific workspace member with their user profile and role.
 * Actor must be a member of the workspace.
 */
import { AppError } from "@/shared/errors";
import type { GetWorkspaceUserInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";

export const getWorkspaceUser = async (
  input: GetWorkspaceUserInput,
  ctx: ServiceContext
) => {
  const { workspaceId, userId, actorUserId } = input;
  const { db } = ctx;

  // Actor must be a workspace member
  const actorMember = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: actorUserId } },
    select: { id: true },
  });
  if (!actorMember) throw AppError.forbidden("Not a member of this workspace");

  return db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { user: true, assignedRole: true },
  });
};
