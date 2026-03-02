import { AppError } from "@/shared/errors";
import { generateDescriptionPresignedGet } from "../../../lib/s3-keys";
import { ISSUE_S3 } from "../../../lib/constants";
import type { IssueDescriptionUrlResult } from "../types";
import type { LeanIssueForDescription } from "./fetch-issue";

export async function generatePresignedGet(
  issue: LeanIssueForDescription
): Promise<IssueDescriptionUrlResult> {
  if (!issue.descriptionS3Key) {
    throw AppError.notFound("This issue has no description.");
  }

  const url = await generateDescriptionPresignedGet(issue.descriptionS3Key);
  const expiresAt = new Date(
    Date.now() + ISSUE_S3.PRESIGNED_GET_TTL_SECONDS * 1000
  );

  return { url, expiresAt };
}
