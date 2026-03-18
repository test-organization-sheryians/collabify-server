/**
 * Pre-generates a UUID, builds the S3 key, and inserts a PENDING IssueDescriptionFile row.
 * The ID is generated before the DB write so the S3 key can be set in a single CREATE call.
 */
import type { PrismaClient } from "@prisma/client";
import { buildIssueDescriptionKey } from "../../../lib/s3-keys";
import type { IssueForUpload } from "./fetch-issue";

export type PendingFileResult = {
  fileId: string;
  s3Key: string;
};

export async function createPendingFile(
  issue: IssueForUpload,
  issueId: string,
  db: PrismaClient
): Promise<PendingFileResult> {
  const fileId = crypto.randomUUID();
  const s3Key = buildIssueDescriptionKey(
    issue.workspaceId,
    issue.projectId,
    issue.id,
    fileId
  );

  await db.issueDescriptionFile.create({
    data: { id: fileId, issueId, s3Key, status: "PENDING" },
  });

  return { fileId, s3Key };
}
