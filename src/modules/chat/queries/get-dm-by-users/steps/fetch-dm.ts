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
 * fetchDm — finds an existing 1:1 DM by its deterministic dmHash.
 *
 * Uses findUnique( dmHash ) instead of findFirst( AND[member, member] ).
 * This is an O(1) unique-index lookup vs. two nested subquery scans.
 *
 * The hash formula matches create-dm exactly:
 *   "proj_{projectId}_{min(userId, otherUserId)}_{max(userId, otherUserId)}"
 *
 * Returns null when no DM exists — valid non-error response meaning the
 * caller may create a new DM.
 */
export async function fetchDm(
  input: GetDmByUsersInput,
  userId: string,
  ctx: ServiceContext
): Promise<DmRow | null> {
  const [u1, u2] = [userId, input.otherUserId].sort();
  const dmHash = `proj_${input.projectId}_${u1}_${u2}`;

  return ctx.db.chatConversation.findUnique({
    where: { dmHash },
    select: dmSelect,
  });
}
