/**
 * For each email: skip if already a member, otherwise upsert invite row
 * and log the invite link. Returns the list of emails actually invited.
 */
import { createLogger } from "@/shared/lib/logger";
import { env } from "@/shared/config/env";
import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

const logger = createLogger("workspace:services:invite-to-workspace");

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export async function sendInvites(
  workspaceId: string,
  actorUserId: string,
  emails: string[],
  db: PrismaClient
): Promise<string[]> {
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);

  const results = (
    await Promise.all(
      emails.map(async (email) => {
        const existingMember = await db.workspaceMember.findFirst({
          where: { workspaceId, user: { email } },
        });

        if (existingMember) return null;

        const token = randomBytes(16).toString("hex");

        await db.$transaction([
          db.workspaceInvite.deleteMany({ where: { workspaceId, email } }),
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
        logger.info(`[INVITE] To: ${email} | Link: ${link}`, { email, token });
        return email;
      })
    )
  ).filter((email): email is string => email !== null);

  return results;
}
