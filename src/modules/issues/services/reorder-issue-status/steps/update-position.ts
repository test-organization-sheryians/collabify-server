/** Sets the status position to `newPosition` (fractional index for column drag). */
import type { PrismaClient, IssueStatus } from "@prisma/client";

export async function updatePosition(
  statusId: string,
  newPosition: number,
  db: PrismaClient
): Promise<IssueStatus> {
  return db.issueStatus.update({
    where: { id: statusId },
    data: { position: newPosition },
  });
}
