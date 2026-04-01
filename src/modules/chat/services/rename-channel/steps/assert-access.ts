import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { RenameChannelInput } from "../types";

export interface AssertAccessOutput {
  channelId: string;
}

/**
 * assertAccess logic internally orchestrating validation limits locally enforcing:
 * 1. Project level limits bounding natively `chat:channel:update`.
 * 2. Strict CUID queries mapping natively.
 */
export async function assertAccess(
  input: RenameChannelInput,
  ctx: ServiceContext
): Promise<AssertAccessOutput> {
  const { userId: actorId } = ctx.auth;
  if (!actorId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated");
  }

  const { channelId } = input;

  // Step 0 — channel member gate + permission
  const cachedChannel = await ctx.authGate.getChannel(channelId);
  if (!cachedChannel) {
    throw AppError.notFound("Channel not found", "NOT_FOUND");
  }
  
  if (!cachedChannel.projectId) {
    throw AppError.badRequest(
      "Channel must belong to a project to evaluate permissions.",
      "BAD_REQUEST"
    );
  }
  
  const scope = {
    type: "project" as const,
    id: cachedChannel.projectId,
    workspaceId: cachedChannel.workspaceId,
  };
  
  await Promise.all([
    ctx.authGate.assertChannelMember(channelId),
    ctx.permissions.assert("chat:channel:update", scope),
  ]);

  return { channelId };
}
