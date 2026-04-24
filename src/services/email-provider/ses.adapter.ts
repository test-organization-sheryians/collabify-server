import { SendEmailCommand } from "@aws-sdk/client-ses";
import { env } from "@/shared/config/env";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("services:providers");
import { sesClient } from "@/infra/aws/ses";

export async function sendWithSES(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
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
    logger.info("Email sent successfully via SES", {
      to,
      subject,
      provider: "SES",
    });
    return { success: true };
  } catch (error) {
    // Never expose internal AWS errors to client — log for debugging
    logger.error("Failed to send email via SES", {
      error: error instanceof Error ? error.message : String(error),
      to,
      subject,
    });
    return {
      success: false,
      error: "Email delivery failed",
    };
  }
}
