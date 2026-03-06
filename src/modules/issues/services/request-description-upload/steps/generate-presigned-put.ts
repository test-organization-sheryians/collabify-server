/** Generates a presigned S3 PUT URL for the given key. Returns url + expiresAt. */
import { generateDescriptionPresignedPut } from "../../../lib/s3-keys";
import { ISSUE_S3 } from "../../../lib/constants";

export type PresignedPutResult = {
  presignedUrl: string;
  expiresAt: Date;
};

export async function generatePresignedPut(
  s3Key: string
): Promise<PresignedPutResult> {
  const presignedUrl = await generateDescriptionPresignedPut(s3Key);
  const expiresAt = new Date(
    Date.now() + ISSUE_S3.PRESIGNED_PUT_TTL_SECONDS * 1000
  );
  return { presignedUrl, expiresAt };
}
