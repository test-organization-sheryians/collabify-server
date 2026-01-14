import { db } from "@/infra/db";
import { AppError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  AcceptInviteSchema,
  GetInviteInfoSchema,
  InviteToWorkspaceSchema,
} from "../types";
import { env } from "@/shared/config/env";

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

const inviteLogger = logger.child({ module: "Invitation" });

export const InvitationLogic = {
  inviteToWorkspace: async (
    input: z.infer<typeof InviteToWorkspaceSchema>,
    ctxDeps = { db }
  ) => {
    const { workspaceId, emails, actorUserId } =
      InviteToWorkspaceSchema.parse(input);

    const actorMember = await ctxDeps.db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: actorUserId,
        },
      },
    });

    if (!actorMember) {
      throw AppError.forbidden("NOT_AUTHORIZED");
    }

    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);

    const results = (
      await Promise.all(
        emails.map(async (email) => {
          const existingMember = await ctxDeps.db.workspaceMember.findFirst({
            where: {
              workspaceId,
              user: { email },
            },
          });

          if (existingMember) {
            return null;
          }

          const token = randomBytes(16).toString("hex");

          await ctxDeps.db.$transaction([
            ctxDeps.db.workspaceInvite.deleteMany({
              where: { workspaceId, email },
            }),
            ctxDeps.db.workspaceInvite.create({
              data: {
                workspaceId,
                email,
                token,
                inviterId: actorUserId,
                expiresAt,
                role: "MEMBER",
              },
            }),
          ]);

          const link = `${env.FRONTEND_URL}/workspace/join?token=${token}`;
          inviteLogger.info(
            { email, token },
            `[INVITE] To: ${email} | Link: ${link}`
          );
          return email;
        })
      )
    ).filter((email): email is string => email !== null);

    return {
      success: true,
      message: `Invites sent to ${results.length} users.`,
      invitedCount: results.length,
    };
  },

  getInviteInfo: async (
    input: z.infer<typeof GetInviteInfoSchema>,
    ctxDeps = { db }
  ) => {
    const { token, userId, userEmail } = GetInviteInfoSchema.parse(input);

    const invite = await ctxDeps.db.workspaceInvite.findUnique({
      where: { token },
      include: {
        workspace: {
          select: { name: true, logoUrl: true },
        },
      },
    });

    if (!invite || invite.expiresAt < new Date()) {
      throw AppError.notFound("INVITE_EXPIRED");
    }

    if (userEmail && invite.email !== userEmail) {
      throw AppError.forbidden("INVITE_EXPIRED");
    }

    if (userId) {
      const member = await ctxDeps.db.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: invite.workspaceId,
            userId,
          },
        },
      });

      if (member) {
        throw AppError.conflict("ALREADY_MEMBER");
      }
    }

    return {
      workspaceName: invite.workspace.name,
      workspaceLogoUrl: invite.workspace.logoUrl,
      inviterName: "Workspace Admin",
    };
  },

  acceptInvite: async (
    input: z.infer<typeof AcceptInviteSchema>,
    ctxDeps = { db }
  ) => {
    const { token, userId, userEmail } = AcceptInviteSchema.parse(input);

    return ctxDeps.db.$transaction(async (tx) => {
      const invite = await tx.workspaceInvite.findUnique({
        where: { token },
      });

      if (!invite || invite.expiresAt < new Date()) {
        throw AppError.notFound("INVITE_EXPIRED");
      }

      if (invite.email !== userEmail) {
        throw AppError.forbidden("INVITE_EXPIRED");
      }

      const existing = await tx.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: invite.workspaceId,
            userId,
          },
        },
      });

      if (existing) {
        await tx.workspaceInvite.delete({ where: { token } });
        return {
          success: true,
          message: "You are already a member.",
          workspaceSlug: "unknown",
        };
      }

      await tx.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId,
          role: invite.role,
        },
      });

      await tx.workspaceInvite.delete({
        where: { token },
      });

      const workspace = await tx.workspace.findUniqueOrThrow({
        where: { id: invite.workspaceId },
        select: { slug: true },
      });

      return {
        success: true,
        message: "Joined workspace successfully",
        workspaceSlug: workspace.slug,
      };
    });
  },
};
