/**
 * Step: Validate Access
 *
 * Verifies the authenticated user has access to the source entity.
 * Throws if:
 *   - Entity not found
 *   - User is not a member of the entity's project/conversation
 *
 * Handles: PAGE, ISSUE, CHAT_MESSAGE source types
 */
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { CreateMentionInput } from "../schema";

export async function validateAccess(
  input: CreateMentionInput,
  ctx: ServiceContext,
  userId: string
): Promise<void> {
  if (!ctx.authGate) throw AppError.unauthorized();

  if (input.sourceEntityType === "PAGE") {
    const page = await ctx.db.page.findUnique({
      where: { id: input.sourceEntityId },
      select: { projectId: true },
    });
    if (!page) throw AppError.notFound("Source page not found");
    await ctx.authGate.assertProjectMember(page.projectId);
    return;
  }

  if (input.sourceEntityType === "ISSUE") {
    const issue = await ctx.db.issue.findUnique({
      where: { id: input.sourceEntityId },
      select: { projectId: true },
    });
    if (!issue) throw AppError.notFound("Source issue not found");
    await ctx.authGate.assertProjectMember(issue.projectId);
    return;
  }

  if (input.sourceEntityType === "CHAT_MESSAGE") {
    const message = await ctx.db.chatMessage.findUnique({
      where: { id: input.sourceEntityId },
      select: { conversationId: true },
    });
    if (!message) throw AppError.notFound("Message not found");
    const member = await ctx.db.chatMember.findFirst({
      where: {
        userId,
        conversationId: message.conversationId,
      },
    });
    if (!member) throw AppError.forbidden("Access denied to conversation");
    return;
  }
}
