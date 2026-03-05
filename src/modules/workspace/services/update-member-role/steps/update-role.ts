/** Update the role of a workspace member. Returns the updated member including user. */
import type { PrismaClient, RoleType } from "@prisma/client";

export async function updateRole(
  memberId: string,
  workspaceId: string,
  role: RoleType,
  db: PrismaClient
) {
  return db.workspaceMember.update({
    where: { id: memberId, workspaceId },
    data: { role },
    include: { user: true },
  });
}
