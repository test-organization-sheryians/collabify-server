/**
 * Loads the IssueDescriptionFile record and asserts it is in PENDING status.
 * Throws NOT_FOUND if the record doesn't exist, CONFLICT if status != PENDING.
 *
 * Also loads projectId and workspaceId via the issue relation — required by
 * activate-file.ts to call activateVaultUsage (C-B8).
 */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export type PendingFileRecord = {
  id: string;
  issueId: string;
  s3Key: string;
  status: string;
  projectId: string;
  workspaceId: string;
};

export async function fetchPendingFile(
  descriptionFileId: string,
  db: PrismaClient
): Promise<PendingFileRecord> {
  const fileRecord = await db.issueDescriptionFile.findUnique({
    where: { id: descriptionFileId },
    select: {
      id: true,
      issueId: true,
      s3Key: true,
      status: true,
      issue: {
        select: {
          projectId: true,
          project: { select: { workspaceId: true } },
        },
      },
    },
  });
  if (!fileRecord)
    throw AppError.notFound("Description upload record not found.");
  if (fileRecord.status !== "PENDING") {
    throw AppError.conflict("Upload is not in PENDING state.");
  }
  return {
    id: fileRecord.id,
    issueId: fileRecord.issueId,
    s3Key: fileRecord.s3Key,
    status: fileRecord.status,
    projectId: fileRecord.issue.projectId,
    workspaceId: fileRecord.issue.project.workspaceId,
  };
}

