import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { GetDmByUsersInput, GetDmByUsersOutput } from "./types";
import { ConversationType } from "@/graphql/generated";

/**
 * Get DM By Users Handler
 *
 * Finds an existing DM conversation between two users in a project.
 * Returns null if no DM exists (not an error).
 * Used for "start conversation" UI to check for existing DMs.
 */
export const handler = async (
  input: GetDmByUsersInput,
  ctx: ServiceContext
): Promise<GetDmByUsersOutput> => {
  const { userId } = ctx.auth;
  if (!userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  const { workspaceId, projectId, otherUserId } = input;

  // Prevent DM with self
  if (userId === otherUserId) {
    throw AppError.badRequest("Cannot create DM with yourself");
  }

  // Verify project membership
  const projectMembership = await ctx.db.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  });

  if (!projectMembership) {
    throw AppError.forbidden("You are not a member of this project");
  }

  // Find DM with both users (project-scoped)
  const dm = await ctx.db.chatConversation.findFirst({
    where: {
      workspaceId,
      projectId,
      type: "DM",
      AND: [
        { members: { some: { userId } } },
        { members: { some: { userId: otherUserId } } },
      ],
      deletedAt: null,
    },
    include: {
      members: {
        include: {
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
    },
  });

  if (!dm) {
    return null; // No DM exists
  }

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
        fullName: m.user.fullName || "Unknown",
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
      },
    })),
    createdAt: dm.createdAt,
    updatedAt: dm.updatedAt,
  };
};
