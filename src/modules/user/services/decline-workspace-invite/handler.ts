import type { DeclineWorkspaceInviteInput } from "./types";
import type { ServiceContext } from "@/graphql/types";

export const declineWorkspaceInvite = async (
  input: DeclineWorkspaceInviteInput,
  ctx: ServiceContext
) => {
  const { token } = input;
  const { db } = ctx;

  const invite = await db.workspaceInvite.findUnique({ where: { token } });
  if (!invite || invite.expiresAt < new Date()) {
    return { success: false, message: "Invite not found or already expired." };
  }

  await db.workspaceInvite.delete({ where: { token } });

  return { success: true, message: "Invite declined." };
};
