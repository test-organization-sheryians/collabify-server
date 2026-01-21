import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { Prisma } from "@prisma/client";
import { CreateChannelInput } from "./types";

export const handler = async (
  input: CreateChannelInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // 1. Authorization: User must be a member of the workspace
    const membership = await ctx.db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          userId,
          workspaceId: input.workspaceId,
        },
      },
    });

    if (!membership) {
      throw AppError.forbidden("You are not a member of this workspace");
    }

    // 2. Validate Project Integrity (if provided)
    if (input.projectId) {
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
        select: { workspaceId: true },
      });

      if (!project || project.workspaceId !== input.workspaceId) {
        throw AppError.badRequest("Invalid project ID for this workspace");
      }
    }

    // 3. Validate Member Integrity (if invited)
    if (input.memberUserIds?.length) {
      const validMembers = await ctx.db.workspaceMember.findMany({
        where: {
          workspaceId: input.workspaceId,
          userId: { in: input.memberUserIds },
        },
        select: { userId: true },
      });

      if (validMembers.length !== input.memberUserIds.length) {
        throw AppError.badRequest(
          "One or more invited users are not members of this workspace"
        );
      }
    }

    // 4. Create Channel
    const channel = await ctx.db.chatChannel.create({
      data: {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        name: input.name,
        topic: input.topic,
        type: input.type,
        members: {
          createMany: {
            data: [
              // Always add the creator as OWNER
              { userId, role: "OWNER" },
              // Add other invited members as MEMBER
              ...(input.memberUserIds
                ?.filter((id) => id !== userId)
                .map((id) => ({
                  userId: id,
                  role: "MEMBER",
                })) || []),
            ],
          },
        },
      },
    });

    return channel;
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw AppError.conflict(
          "Channel with this name already exists in the project"
        );
      }
    }
    // Re-throw AppErrors
    if (error instanceof AppError) throw error;

    // Default fallback
    throw new AppError("Failed to create channel");
  }
};
