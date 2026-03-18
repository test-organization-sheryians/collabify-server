import type { Conversation } from "@/graphql/generated";
import { ConversationType } from "@/graphql/generated";
import type { ConversationRow, LastMessageRow, MemberRow } from "../types";

/**
 * buildResponse — pure mapping step, no IO, no side effects.
 *
 * Maps DB rows into the Conversation GQL response shape.
 * Kept separate from fetchConversation so the mapping layer is independently
 * testable without any DB context.
 *
 * // TODO: `createdBy` always returns null — the DB schema does not track this field.
 * // Either add a `createdBy` column to chatConversation or drop the SDL field.
 */
export function buildResponse(
  row: ConversationRow,
  unreadCount: number,
  lastMessage: LastMessageRow | null,
  userId: string
): Conversation {
  return {
    id: row.id,
    type: row.type as unknown as ConversationType,
    name: row.name,
    topic: row.topic,
    isPublic: row.type === "CHANNEL",
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    parentMessageId: row.parentMessageId,
    createdBy: null, // Not tracked in current schema
    isArchived: row.isArchived,
    memberCount: row.members.length,
    unreadCount,
    members: row.members.map((m: MemberRow) => ({
      userId: m.userId,
      role: m.role,
      isMuted: m.isMuted,
      joinedAt: m.joinedAt,
      user: {
        ...m.user,
        fullName: m.user.fullName || "Unknown",
      },
    })),
    lastMessage: lastMessage ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}
