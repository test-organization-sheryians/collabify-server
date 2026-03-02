/** Patches mutable label fields (name, color). Returns updated label. */
import type { PrismaClient, IssueLabel } from "@prisma/client";
import type { UpdateIssueLabelInput } from "../schema";

export async function patchLabel(
  input: UpdateIssueLabelInput,
  db: PrismaClient
): Promise<IssueLabel> {
  return db.issueLabel.update({
    where: { id: input.labelId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.color !== undefined && { color: input.color }),
    },
  });
}
