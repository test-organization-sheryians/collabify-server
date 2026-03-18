import { sendGridClient } from "@/infra/sendgrid";
import { env } from "@/shared/config/env";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("services:providers");
import { AppError } from "@/shared/errors";

// Define the shape of SendGrid errors
interface SendGridError extends Error {
  code?: number;
  response?: {
    headers: Record<string, unknown>;
    body: unknown;
  };
}

export const sendWithSendGrid = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  try {
    const msg = {
      to,
      from: env.EMAIL_FROM,
      subject,
      html,
    };

    await sendGridClient.send(msg);
    logger.info("Email sent successfully via SendGrid", {
      to,
      subject,
      provider: "SendGrid",
    });
  } catch (rawError: unknown) {
    // Safe cast for error handling purposes
    const error = rawError as SendGridError;

    logger.error("Failed to send email via SendGrid", { error, to, subject });

    // Convert SendGrid error to AppError
    throw new AppError(
      "Failed to send email via SendGrid",
      "NOTIFICATION_PROVIDER_ERROR",
      502,
      true,
      {
        provider: "sendgrid",
        originalError:
          error.response?.body || error.message || "Unknown SendGrid Error",
      }
    );
  }
};
