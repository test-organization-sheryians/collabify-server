/**
 * Atomically:
 *   a. Supersede any currently ACTIVE files for this issue
 *   b. Activate this file (set status=ACTIVE, record sizeBytes + confirmedAt)
 *   c. Update issue.descriptionS3Key to point to this file
 *
 * Order ensures no window where two ACTIVE rows coexist.
 */
import type { PrismaClient } from "@prisma/client";
import type { IssueRow } from "../../../queries/get-project-issues/types";
import type { PendingFileRecord } from "./fetch-pending-file";
import type { S3Meta } from "./verify-s3-object";

export async function activateFile(
  fileRecord: PendingFileRecord,
  meta: S3Meta,
  db: PrismaClient
): Promise<IssueRow> {
  return db.$transaction(async (tx) => {
    // a. Supersede any currently ACTIVE file first
    await tx.issueDescriptionFile.updateMany({
      where: { issueId: fileRecord.issueId, status: "ACTIVE" },
      data: { status: "SUPERSEDED" },
    });

    // b. Activate this file
    await tx.issueDescriptionFile.update({
      where: { id: fileRecord.id },
      data: {
        status: "ACTIVE",
        sizeBytes: meta.contentLength,
        confirmedAt: new Date(),
      },
    });

    // c. Update issue pointer
    const updated = await tx.issue.update({
      where: { id: fileRecord.issueId },
      data: { descriptionS3Key: fileRecord.s3Key },
      include: {
        status: true,
        assignee: { select: { id: true, fullName: true, avatarUrl: true } },
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
        labels: { include: { label: true } },
      },
    });

    return updated as IssueRow;
  });
}
