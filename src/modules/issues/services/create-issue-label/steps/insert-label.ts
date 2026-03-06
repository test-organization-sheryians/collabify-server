/** Creates the IssueLabel row. Returns the new label. */
import type { PrismaClient, IssueLabel } from "@prisma/client";
import type { CreateIssueLabelInput } from "../schema";

export async function insertLabel(
  input: CreateIssueLabelInput,
  db: PrismaClient
): Promise<IssueLabel> {
  return db.issueLabel.create({
    data: { projectId: input.projectId, name: input.name, color: input.color },
  });
}
