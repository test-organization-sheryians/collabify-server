import { SendEmailCommand } from "@aws-sdk/client-ses";
import { env } from "@/shared/config/env";
import { logger } from "@/shared/logger";
import { AppError } from "@/shared/errors";
import { sesClient } from "@/infra/aws/ses";

export const sendWithSES = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  try {
    const command = new SendEmailCommand({
      Source: env.EMAIL_FROM,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: { Data: subject },
        Body: {
          Html: { Data: html },
        },
      },
    });

    await sesClient.send(command);
    logger.info(
      { to, subject, provider: "SES" },
      "Email sent successfully via SES"
    );
  } catch (error) {
    logger.error({ error, to, subject }, "Failed to send email via SES");
    throw new AppError(
      "Failed to send email via SES",
      "NOTIFICATION_PROVIDER_ERROR",
      502,
      true,
      { originalError: error }
    );
  }
};
