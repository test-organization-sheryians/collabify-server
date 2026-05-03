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
 * Member role is sourced from the user's ProjectMember.projectRole (project-level
 * RBAC), falling back to "MEMBER" for users without a project-scoped role.
 *
 * // TODO: `createdBy` always returns null — the DB schema does not track this field.
 * // Either add a `createdBy` column to chatConversation or drop the SDL field.
 */
export function buildResponse(
  row: ConversationRow,
  unreadCount: number,
  lastMessage: LastMessageRow | null,
  _userId: string
): Conversation {
  return {
    id: row.id,
    type: row.type as unknown as ConversationType,
    name: row.name,
    topic: row.topic,
    isPublic: row.isPublic,
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    parentMessageId: row.parentMessageId,
    createdBy: null, // Not tracked in current schema
    isArchived: row.isArchived,
    memberCount: row.members.length,
    unreadCount,
    members: row.members.map((m: MemberRow) => ({
      userId: m.userId,
      // Project-level role is the authoritative role; channel-level role was removed.
      role: m.user.projectMembers?.[0]?.projectRole?.name ?? "MEMBER",
      isMuted: m.isMuted,
      joinedAt: m.joinedAt,
      user: {
        id: m.user.id,
        fullName: m.user.fullName || "Unknown",
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
      },
    })),
    lastMessage: lastMessage ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}
