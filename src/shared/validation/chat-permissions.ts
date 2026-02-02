import { PrismaClient, ChatMember, ChatMessage } from "@prisma/client";

/**
 * Reusable Chat Permission Validation Functions
 *
 * These functions are used across WebSocket handlers to validate
 * user permissions before performing mutations (edit, delete, etc.)
 */

/**
 * Validate user is a conversation member
 */
export async function validateConversationMembership(
  db: PrismaClient,
  userId: string,
  conversationId: string
): Promise<Partial<ChatMember> | null> {
  return await db.chatMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
    select: {
      id: true,
      conversationId: true,
      userId: true,
      isMuted: true,
      role: true,
    },
  });
}

/**
 * Fetch message with validation data
 */
export async function fetchMessageForValidation(
  db: PrismaClient,
  messageId: string
): Promise<Pick<
  ChatMessage,
  | "id"
  | "conversationId"
  | "authorUserId"
  | "createdAt"
  | "deletedAt"
  | "content"
> | null> {
  return await db.chatMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      conversationId: true,
      authorUserId: true,
      content: true,
      createdAt: true,
      deletedAt: true,
    },
  });
}

/**
 * Validate message ownership
 */
export function validateMessageOwnership(
  message: { authorUserId: string },
  userId: string
): boolean {
  return message.authorUserId === userId;
}

/**
 * Validate edit time window (default 5 minutes)
 */
export function validateEditWindow(
  message: { createdAt: Date },
  windowMinutes: number = 5
): boolean {
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
  return message.createdAt > cutoff;
}

/**
 * Validate message not deleted
 */
export function validateMessageNotDeleted(message: {
  deletedAt: Date | null;
}): boolean {
  return message.deletedAt === null;
}

/**
 * Combined validation for edit operation
 */
export async function validateEditMessage(
  db: PrismaClient,
  userId: string,
  messageId: string
): Promise<{
  valid: boolean;
  message?: ChatMessage;
  error?: { code: string; message: string };
}> {
  // Fetch message
  const message = await fetchMessageForValidation(db, messageId);

  if (!message) {
    return {
      valid: false,
      error: { code: "NOT_FOUND", message: "Message not found" },
    };
  }

  // Check deleted
  if (!validateMessageNotDeleted(message)) {
    return {
      valid: false,
      error: { code: "FORBIDDEN", message: "Cannot edit deleted message" },
    };
  }

  // Check membership
  const membership = await validateConversationMembership(
    db,
    userId,
    message.conversationId
  );

  if (!membership) {
    return {
      valid: false,
      error: { code: "FORBIDDEN", message: "Not a conversation member" },
    };
  }

  // Check ownership
  if (!validateMessageOwnership(message, userId)) {
    return {
      valid: false,
      error: { code: "FORBIDDEN", message: "Not the message author" },
    };
  }

  // Check edit window
  if (!validateEditWindow(message)) {
    return {
      valid: false,
      error: { code: "FORBIDDEN", message: "Edit window expired (5 min)" },
    };
  }

  return { valid: true, message: message as ChatMessage };
}

/**
 * Combined validation for delete operation
 */
export async function validateDeleteMessage(
  db: PrismaClient,
  userId: string,
  messageId: string
): Promise<{
  valid: boolean;
  message?: ChatMessage;
  error?: { code: string; message: string };
}> {
  const message = await fetchMessageForValidation(db, messageId);

  if (!message) {
    return {
      valid: false,
      error: { code: "NOT_FOUND", message: "Message not found" },
    };
  }

  // Check already deleted
  if (!validateMessageNotDeleted(message)) {
    return {
      valid: false,
      error: { code: "CONFLICT", message: "Message already deleted" },
    };
  }

  // Check membership
  const membership = await validateConversationMembership(
    db,
    userId,
    message.conversationId
  );

  if (!membership) {
    return {
      valid: false,
      error: { code: "FORBIDDEN", message: "Not a conversation member" },
    };
  }

  // Check ownership
  if (!validateMessageOwnership(message, userId)) {
    return {
      valid: false,
      error: { code: "FORBIDDEN", message: "Not the message author" },
    };
  }

  return { valid: true, message: message as ChatMessage };
}

/**
 * Validate parent message for inline reply (message-reference)
 *
 * This is for inline replies (Discord-style message references),
 * NOT for thread conversations (which are separate conversation entities).
 */
export async function validateReplyParent(
  db: PrismaClient,
  parentMessageId: string,
  conversationId: string
): Promise<{
  valid: boolean;
  error?: { code: string; message: string };
}> {
  const parentMessage = await db.chatMessage.findUnique({
    where: { id: parentMessageId },
    select: {
      id: true,
      conversationId: true,
      deletedAt: true,
    },
  });

  // Parent must exist
  if (!parentMessage) {
    return {
      valid: false,
      error: {
        code: "PARENT_NOT_FOUND",
        message: "Referenced message not found",
      },
    };
  }

  // Parent must not be deleted
  if (parentMessage.deletedAt) {
    return {
      valid: false,
      error: {
        code: "PARENT_DELETED",
        message: "Cannot reply to deleted message",
      },
    };
  }

  // Parent must be in same conversation
  if (parentMessage.conversationId !== conversationId) {
    return {
      valid: false,
      error: {
        code: "PARENT_DIFFERENT_CONVERSATION",
        message: "Referenced message not in this conversation",
      },
    };
  }

  return { valid: true };
}
