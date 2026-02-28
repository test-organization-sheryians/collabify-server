import {
  S3Client,
  S3ClientConfig,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { env } from "@/shared/config/env";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("infra:s3");

/**
 * Global S3 Client Configuration
 *
 * Follows the same pattern as SES client for consistency.
 * Used for whiteboard snapshot storage.
 */
const getS3Config = (): S3ClientConfig => {
  const config: S3ClientConfig = {
    region: env.AWS_REGION,
  };

  if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    };
  } else {
    logger.debug(
      "AWS S3: No explicit credentials found in env, relying on DefaultCredentialProviderChain (IAM/Profile)"
    );
  }

  return config;
};

export const s3Client = new S3Client(getS3Config());

/**
 * Check S3 connection on server startup
 */
export const checkS3Connection = async () => {
  try {
    await s3Client.send(
      new HeadBucketCommand({ Bucket: env.S3_WHITEBOARD_BUCKET })
    );
    logger.info("✅ AWS S3 Connected");
  } catch (error) {
    logger.error("❌ AWS S3 Connection Failed", { error });
  }
};
