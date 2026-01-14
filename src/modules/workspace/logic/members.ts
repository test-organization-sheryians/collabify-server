import { db } from "@/infra/db";
import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { z } from "zod";
import { RoleType } from "@prisma/client";

// Zod Schemas
const getMembersSchema = z.object({
  workspaceId: z.string().cuid(),
  // Add pagination limits later if needed
});

const updateMemberRoleSchema = z.object({
  workspaceId: z.string().cuid(),
  memberId: z.string().cuid(),
  role: z.nativeEnum(RoleType),
  actorUserId: z.string().cuid(),
});

const removeMemberSchema = z.object({
  workspaceId: z.string().cuid(),
  memberId: z.string().cuid(),
  actorUserId: z.string().cuid(),
});

export const MembersLogic = {
  getWorkspaceMembers: async (
    _ctx: ServiceContext,
    args: { workspaceId: string; actorUserId: string }
  ) => {
    // 1. Validation: Explicit Argument
    const { workspaceId } = getMembersSchema.parse(args);

    // 2. Authorization: Ensure user has access to this workspace
    // Use the resolved actorUserId (Local CUID) not the Clerk ID
    const membership = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: args.actorUserId,
        },
      },
    });

    if (!membership) {
      throw AppError.forbidden("You are not a member of this workspace");
    }

    // 3. Database Call (Tenant Isolation)
    const members = await db.workspaceMember.findMany({
      where: {
        workspaceId: workspaceId,
      },
      include: {
        user: true,
      },
      orderBy: {
        joinedAt: "desc",
      },
    });

    return members;
  },

  updateMemberRole: async (input: z.infer<typeof updateMemberRoleSchema>) => {
    const { workspaceId, memberId, role, actorUserId } =
      updateMemberRoleSchema.parse(input);

    const actorMember = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: actorUserId,
        },
      },
    });

    if (!actorMember || actorMember.role !== RoleType.OWNER) {
      throw AppError.forbidden("Only owners can update roles");
    }

    const updatedMember = await db.workspaceMember.update({
      where: {
        id: memberId,
        workspaceId: workspaceId,
      },
      data: {
        role,
      },
      include: {
        user: true,
      },
    });

    return updatedMember;
  },

  removeMember: async (input: z.infer<typeof removeMemberSchema>) => {
    const { workspaceId, memberId, actorUserId } =
      removeMemberSchema.parse(input);

    const actorMember = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: actorUserId,
        },
      },
    });

    const targetMember = await db.workspaceMember.findUnique({
      where: { id: memberId, workspaceId },
    });

    if (!targetMember) {
      throw AppError.notFound("Member not found");
    }

    const isSelf = targetMember.userId === actorUserId;
    const isOwner = actorMember?.role === RoleType.OWNER;

    if (!isSelf && !isOwner) {
      throw AppError.forbidden("Insufficient permissions");
    }

    if (targetMember.role === RoleType.OWNER) {
      const ownerCount = await db.workspaceMember.count({
        where: { workspaceId, role: RoleType.OWNER },
      });
      if (ownerCount <= 1) {
        throw AppError.badRequest("Cannot remove the last owner");
      }
    }

    await db.workspaceMember.delete({
      where: {
        id: memberId,
      },
    });

    return { success: true, message: "Member removed", invitedCount: 0 };
  },
};
