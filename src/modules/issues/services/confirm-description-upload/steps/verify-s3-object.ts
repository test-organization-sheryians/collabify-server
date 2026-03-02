/**
 * Calls S3 HeadObject to confirm the object was successfully uploaded.
 * Throws BAD_REQUEST if the object does not exist in S3.
 */
import { AppError } from "@/shared/errors";
import { headS3DescriptionObject } from "../../../lib/s3-keys";

export type S3Meta = { contentLength: number };

export async function verifyS3Object(s3Key: string): Promise<S3Meta> {
  try {
    return await headS3DescriptionObject(s3Key);
  } catch {
    throw AppError.badRequest(
      "Description upload not found in S3. Please retry upload."
    );
  }
}
