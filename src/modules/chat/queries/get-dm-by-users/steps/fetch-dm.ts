import { Prisma } from "@prisma/client";
import type { ServiceContext } from "@/graphql/types";
import type { GetDmByUsersInput } from "../schema";

// Select const lives here — next to the query that uses it.
// DmRow derives from it via GetPayload so they can never drift.
const dmSelect = {
  id: true,
  workspaceId: true,
  projectId: true,
  type: true,
  createdAt: true,
  updatedAt: true,
  members: {
    select: {
      userId: true,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  },
} satisfies Prisma.ChatConversationSelect;

export type DmRow = Prisma.ChatConversationGetPayload<{
  select: typeof dmSelect;
}>;

export type DmMemberRow = DmRow["members"][number];

/**
 * fetchDm — finds an existing DM conversation between two users in a project.
 *
 * Returns null if no DM exists — this is not an error, it simply means no prior
 * DM between these users in this project. The caller decides what to do (e.g.,
 * prompt the user to start a new DM).
 *
 * The AND filter ensures BOTH users are members of the same DM conversation.
 * Scoped to the workspace + project + DM type so other conversation types
 * (channels, groups) are excluded.
 *
 * Soft-deleted DMs (deletedAt != null) are excluded — they behave as if they
 * don't exist and a new DM would be created if needed.
 */
export async function fetchDm(
  input: GetDmByUsersInput,
  userId: string,
  ctx: ServiceContext
): Promise<DmRow | null> {
  return ctx.db.chatConversation.findFirst({
    where: {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      type: "DM",
      AND: [
        { members: { some: { userId } } },
        { members: { some: { userId: input.otherUserId } } },
      ],
      deletedAt: null,
    },
    select: dmSelect,
  });
}
