import { ConversationType } from "@/graphql/generated";
import type { DmRow } from "./fetch-dm";

/**
 * buildResponse — pure mapping step, no IO, no side effects.
 *
 * Maps a DmRow DB result into the DmConversation GQL shape.
 * Kept separate from fetchDm so the mapping layer is independently
 * testable without any DB context.
 *
 * fullName falls back to "Unknown" for users where the profile sync
 * has not yet populated the field.
 */
export function buildResponse(dm: DmRow) {
  return {
    id: dm.id,
    workspaceId: dm.workspaceId,
    projectId: dm.projectId!,
    type: ConversationType.Dm,
    memberCount: dm.members.length,
    members: dm.members.map((m) => ({
      userId: m.userId,
      user: {
        id: m.user.id,
        fullName: m.user.fullName ?? "Unknown",
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
      },
    })),
    createdAt: dm.createdAt,
    updatedAt: dm.updatedAt,
  };
}
