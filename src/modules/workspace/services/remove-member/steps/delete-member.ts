/** Delete the workspace member record by its ID. */
import type { PrismaClient } from "@prisma/client";

export async function deleteMember(
  memberId: string,
  db: PrismaClient
): Promise<void> {
  await db.workspaceMember.delete({ where: { id: memberId } });
}
