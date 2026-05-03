import { Prisma } from "@prisma/client";
import type { ServiceContext } from "@/graphql/types";
import type { GetProjectDmsInput } from "../schema";

// Select shape: include both members' user profiles so the client can
// display the other user's name + avatar without a second round-trip.
const projectDmSelect = {
  id: true,
  workspaceId: true,
  projectId: true,
  type: true,
  updatedAt: true,
  members: {
    select: {
      userId: true,
      lastReadSeq: true,
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
  _count: {
    select: { messages: true },
  },
} satisfies Prisma.ChatConversationSelect;

export type ProjectDmRow = Prisma.ChatConversationGetPayload<{
  select: typeof projectDmSelect;
}>;

/**
 * fetchProjectDms — returns all active DMs the caller is a member of
 * within a specific project, ordered most recent first.
 *
 * Each row includes both members' user profiles so the caller can compute
 * the "other user" display without a second DB round-trip.
 *
 * Soft-deleted DMs (deletedAt != null) are excluded.
 */
export async function fetchProjectDms(
  input: GetProjectDmsInput,
  userId: string,
  ctx: ServiceContext
): Promise<ProjectDmRow[]> {
  return ctx.db.chatConversation.findMany({
    where: {
      projectId: input.projectId,
      type: "DM",
      members: { some: { userId } },
      deletedAt: null,
    },
    select: projectDmSelect,
    orderBy: { updatedAt: "desc" },
  });
}
