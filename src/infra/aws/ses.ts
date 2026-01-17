import { SESClient, SESClientConfig } from "@aws-sdk/client-ses";
import { env } from "@/shared/config/env";
import { logger } from "@/shared/logger";

const getSESConfig = (): SESClientConfig => {
  const config: SESClientConfig = {
    region: env.AWS_REGION,
  };
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
  return config;
};

export const sesClient = new SESClient(getSESConfig());

export const checkSESConnection = async () => {
  try {
    await sesClient.send(
      new (await import("@aws-sdk/client-ses")).GetSendQuotaCommand({})
    );
    logger.info("✅ AWS SES Connected");
  } catch (error) {
    logger.error({ error }, "❌ AWS SES Connection Failed");
  }
};
