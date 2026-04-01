import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { CreateThreadInput } from "../types";

/**
 * assertAccess logic for create-thread.
 * Checks `chat:dm:create` role against targeted conversation/message bounds.
 * Maps Parent Message existence properties, ensuring threads aren't bound defensively to target replies.
 * Scrutinizes Parent Conversation bounds (matching Workspace scopes, checking active properties).
 */
export async function assertAccess(
  input: CreateThreadInput,
  ctx: ServiceContext
): Promise<void> {
  if (!ctx.authGate || !ctx.permissions || !ctx.auth?.userId) {
    throw AppError.unauthorized();
  }

  const { workspaceId, projectId, conversationId, messageId } = input;

  // Step 0 — member gates + permission
  const proj = await ctx.authGate.getProject(projectId);
  const scope = {
    type: "project" as const,
    id: projectId,
    workspaceId: proj?.workspaceId ?? workspaceId,
  };
  
  await Promise.all([
    ctx.authGate.assertProjectMember(projectId),
    ctx.authGate.assertChannelMember(conversationId),
    ctx.permissions.assert("chat:dm:create", scope),
  ]);

  // 3. Validate parent message exists and belongs to conversation
  const parentMessage = await ctx.db.chatMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      conversationId: true,
      parentMessageId: true,
    },
  });

  if (!parentMessage) {
    throw AppError.notFound("Message not found");
  }

  if (parentMessage.conversationId !== conversationId) {
    throw AppError.badRequest(
      "Message does not belong to the specified conversation"
    );
  }

  // Prevent threading on reply messages (only thread on top-level messages)
  if (parentMessage.parentMessageId) {
    throw AppError.badRequest(
      "Cannot create thread on a reply message. Threads can only be created on top-level messages."
    );
  }

  // 4. Validate parent conversation exists and matches workspace/project
  const parentConversation = await ctx.db.chatConversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      workspaceId: true,
      projectId: true,
      isArchived: true,
      deletedAt: true,
    },
  });

  if (!parentConversation) {
    throw AppError.notFound("Conversation not found");
  }

  if (parentConversation.workspaceId !== workspaceId) {
    throw AppError.badRequest("Conversation does not belong to this workspace");
  }

  if (parentConversation.projectId !== projectId) {
    throw AppError.badRequest("Conversation does not belong to this project");
  }

  if (parentConversation.isArchived) {
    throw AppError.badRequest("Cannot create thread in archived conversation");
  }

  if (parentConversation.deletedAt) {
    throw AppError.badRequest("Cannot create thread in deleted conversation");
  }
}
