import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { LeaveGroupInput } from "../types";

export interface AssertAccessOutput {
  group: {
    id: string;
    members: { userId: string }[];
  };
}

/**
 * assertAccess logic for leave-group.
 * Evaluates member restrictions securely mapping target channel against explicit native check.
 * Strictly verifies `GROUP_DM` restrictions natively preventing unmapped queries.
 */
export async function assertAccess(
  input: LeaveGroupInput,
  ctx: ServiceContext
): Promise<AssertAccessOutput> {
  const { userId } = ctx.auth;
  if (!ctx.authGate || !ctx.permissions || !userId) {
    throw AppError.unauthorized();
  }

  const { workspaceId, groupId } = input;

  // Step 0 — channel member gate
  const cachedChannel = await ctx.authGate.getChannel(groupId);
  if (!cachedChannel) {
    throw AppError.notFound("Group not found", "NOT_FOUND");
  }
  
  await ctx.authGate.assertChannelMember(groupId);

  // Verify group exists and user is member explicitly against DB
  const group = await ctx.db.chatConversation.findFirst({
    where: {
      id: groupId,
      workspaceId,
      type: "GROUP_DM" as const,
      members: { some: { userId } },
      deletedAt: null,
    },
    include: {
      members: { select: { userId: true } },
    },
  });

  if (!group) {
    throw AppError.notFound("Group not found or you are not a member", "NOT_FOUND");
  }

  return { group };
}
