import { sendGridClient } from "@/infra/sendgrid";
import { env } from "@/shared/config/env";
import { logger } from "@/shared/logger";
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
    logger.info(
      { to, subject, provider: "SendGrid" },
      "Email sent successfully via SendGrid"
    );
  } catch (rawError: unknown) {
    // Safe cast for error handling purposes
    const error = rawError as SendGridError;

    logger.error({ error, to, subject }, "Failed to send email via SendGrid");

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
