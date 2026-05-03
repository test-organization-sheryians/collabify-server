import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { DeleteDmInput } from "../types";

export interface AssertAccessOutput {
  members: { userId: string }[];
}

/**
 * assertAccess logic for delete-dm.
 * Validates `chat:channel:delete` permissions scoped over target projects.
 * Explicitly guards `TYPE: 'DM'` integrity via Prisma `.findFirst()` queries binding securely
 * against `userId` checks restricting out-of-bounds mutation mappings before array fanout loops.
 */
export async function assertAccess(
  input: DeleteDmInput,
  ctx: ServiceContext
): Promise<AssertAccessOutput> {
  if (!ctx.authGate || !ctx.permissions || !ctx.auth?.userId) {
    throw AppError.unauthorized();
  }

  const { workspaceId, dmId } = input;
  const { userId } = ctx.auth;

  // Step 0 — channel member gate (DM uses channelId = dmId)
  const cachedChannel = await ctx.authGate.getChannel(dmId);
  if (!cachedChannel) throw AppError.notFound("DM not found");
  if (!cachedChannel.projectId) {
    throw AppError.badRequest("Channel must belong to a project to evaluate permissions.");
  }
  
  const scope = { 
    type: "project" as const, 
    id: cachedChannel.projectId, 
    workspaceId: cachedChannel.workspaceId 
  };
  
  await Promise.all([
    ctx.authGate.assertChannelMember(dmId),
    ctx.permissions.assert("chat:channel:delete", scope),
  ]);

  // Verify DM exists and user is member (also needed for fanout participants)
  const dm = await ctx.db.chatConversation.findFirst({
    where: {
      id: dmId,
      workspaceId,
      type: "DM",
      members: { some: { userId } },
    },
    include: {
      members: { select: { userId: true } },
    },
  });

  if (!dm) {
    throw AppError.notFound("DM not found or access denied");
  }

  // Return mapped participants array downstream carrying contextual member states safely.
  return { members: dm.members };
}
