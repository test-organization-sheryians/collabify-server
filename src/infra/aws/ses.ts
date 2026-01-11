import { SESClient, SESClientConfig } from "@aws-sdk/client-ses";
import { env } from "@/shared/config/env";
import { logger } from "@/shared/logger";

/**
 * AWS SES Client Architecture
 *
 * This module provides a singleton instance of the AWS SES Client.
 * It handles credential resolution, region configuration, and potential
 * local development overrides (e.g. LocalStack).
 */

const getSESConfig = (): SESClientConfig => {
  const config: SESClientConfig = {
    region: env.AWS_REGION,
  };

  // 1. Credentials
  // If explicit keys are provided in env, usage them.
  // Otherwise, AWS SDK will fall back to formatting provider chain (IAM Role, ~/.aws/credentials)
  if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    };
  } else {
    logger.debug(
      "AWS SES: No explicit credentials found in env, relying on DefaultCredentialProviderChain (IAM/Profile)"
    );
  }

  // 2. Local/Custom Endpoint (Optional for future)
  // if (env.AWS_ENDPOINT) {
  //   config.endpoint = env.AWS_ENDPOINT;
  // }

  return config;
};

// Singleton Instance
export const sesClient = new SESClient(getSESConfig());

/**
 * Health Check helper to verify SES connectivity
 */
export const checkSESConnection = async () => {
  try {
    // A lightweight call to verify access, e.g. getSendQuota
    await sesClient.send(
      new (await import("@aws-sdk/client-ses")).GetSendQuotaCommand({})
    );
    logger.info("✅ AWS SES Connected");
  } catch (error) {
    logger.error({ error }, "❌ AWS SES Connection Failed");
  }
};
