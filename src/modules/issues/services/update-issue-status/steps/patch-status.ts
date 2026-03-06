/** Patches mutable IssueStatus fields (name, color, icon). Returns updated row. */
import type { PrismaClient, IssueStatus } from "@prisma/client";
import type { UpdateIssueStatusInput } from "../schema";

export async function patchStatus(
  input: UpdateIssueStatusInput,
  db: PrismaClient
): Promise<IssueStatus> {
  return db.issueStatus.update({
    where: { id: input.statusId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.icon !== undefined && { icon: input.icon }),
    },
  });
}
