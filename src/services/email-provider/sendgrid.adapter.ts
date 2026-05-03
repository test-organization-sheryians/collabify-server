import { sendGridClient } from "@/infra/sendgrid";
import { env } from "@/shared/config/env";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("services:providers");

// Define the shape of SendGrid errors
interface SendGridError extends Error {
  code?: number;
  response?: {
    headers: Record<string, unknown>;
    body: unknown;
  };
}

export async function sendWithSendGrid(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
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
    return { success: true };
  } catch (rawError: unknown) {
    // Never expose SendGrid internal errors to client — log for debugging
    const error = rawError as SendGridError;
    logger.error("Failed to send email via SendGrid", {
      error: error.response?.body || error.message || "Unknown SendGrid Error",
      to,
      subject,
    });
    return {
      success: false,
      error: "Email delivery failed",
    };
  }
}
