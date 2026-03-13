import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

/** Channel-scoped auth gate for get-messages-delta. */
export async function assertAccess(
  conversationId: string,
  ctx: ServiceContext
): Promise<void> {
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const cachedChannel = await ctx.authGate.getChannel(conversationId);
  if (!cachedChannel) throw AppError.notFound("Conversation not found");

  const scope = { type: "workspace" as const, id: cachedChannel.workspaceId };
  await Promise.all([
    ctx.authGate.assertChannelMember(conversationId),
    ctx.permissions.assert("conversation:read", scope),
  ]);
}
