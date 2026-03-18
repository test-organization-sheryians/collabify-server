/**
 * For each email: skip if already a member, otherwise upsert invite row
 * and send an invite email via the configured email provider.
 * Returns the list of emails actually invited.
 */
import { createLogger } from "@/shared/lib/logger";
import { env } from "@/shared/config/env";
import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { emailProvider } from "@/services/email-provider";

const logger = createLogger("workspace:services:invite-to-workspace");

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function buildInviteEmailHtml(inviteLink: string, workspaceName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#18181b;padding:28px 36px;">
            <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">
              Collabify
            </span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 36px 28px;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">
              You've been invited!
            </h1>
            <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.6;">
              A workspace admin has invited you to join
              <strong style="color:#111827;">${workspaceName}</strong> on Collabify.
            </p>
            <a href="${inviteLink}"
               style="display:inline-block;background:#18181b;color:#ffffff;font-size:14px;
                      font-weight:600;text-decoration:none;padding:12px 28px;
                      border-radius:8px;">
              Accept Invitation
            </a>
            <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
              This link expires in 7 days. If you didn't expect this email, you can safely ignore it.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:16px 36px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">
              Link not working? Copy and paste this URL into your browser:<br/>
              <span style="color:#6b7280;">${inviteLink}</span>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendInvites(
  workspaceId: string,
  actorUserId: string,
  emails: string[],
  db: PrismaClient
): Promise<string[]> {
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);

  // Fetch workspace name once — used in every invite email
  const workspace = await db.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { name: true },
  });

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
        console.log(link)

        // Log the link for debugging regardless of provider
        logger.info(`[INVITE] Sending to: ${email}`, { email, workspaceId });

        // Send real email via configured provider
        await emailProvider.send(
          email,
          `You've been invited to join ${workspace.name} on Collabify`,
          buildInviteEmailHtml(link, workspace.name)
        );

        return email;
      })
    )
  ).filter((email): email is string => email !== null);

  return results;
}

