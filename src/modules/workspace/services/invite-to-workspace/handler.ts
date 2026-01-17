import { AppError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { randomBytes } from "node:crypto";
import { env } from "@/shared/config/env";
import { InviteToWorkspaceInput } from "./types";
import { ServiceContext } from "@/graphql/types";

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const inviteLogger = logger.child({ module: "Invitation" });

export const inviteToWorkspace = async (
  input: InviteToWorkspaceInput,
  ctx: ServiceContext
) => {
  const { workspaceId, emails, actorUserId } = input;
  const { db } = ctx;

  const actorMember = await db.workspaceMember.findUnique({
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
        const existingMember = await db.workspaceMember.findFirst({
          where: {
            workspaceId,
            user: { email },
          },
        });

        if (existingMember) {
          return null;
        }

        const token = randomBytes(16).toString("hex");

        await db.$transaction([
          db.workspaceInvite.deleteMany({
            where: { workspaceId, email },
          }),
          db.workspaceInvite.create({
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
};
