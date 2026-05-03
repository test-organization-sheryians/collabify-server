import { Resend } from "resend";
import { env } from "@/shared/config/env";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("services:providers");

const resend = new Resend(env.RESEND_API_KEY);

interface SendResult {
  success: boolean;
  error?: string;
}

export async function sendWithResend(
  to: string,
  subject: string,
  html: string
): Promise<SendResult> {
  try {
    const response = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    if (response.error) {
      // Don't expose Resend-specific error codes/messages to callers
      // Log for debugging, return generic failure
      logger.error("Resend email delivery failed", {
        to,
        subject,
        resendErrorName: response.error.name,
        resendMessage: response.error.message,
        resendStatusCode: response.error.statusCode,
      });
      return {
        success: false,
        error: "Email delivery failed",
      };
    }

    logger.info("Email sent successfully via Resend", {
      to,
      subject,
      provider: "Resend",
    });
    return { success: true };
  } catch (error) {
    // Catch-all for unexpected errors (network, etc.) — never expose to client
    logger.error("Unexpected error sending email via Resend", {
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

// Backward compatible throw-based version for cases where you WANT the error
export async function sendWithResendOrThrow(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const result = await sendWithResend(to, subject, html);
  if (!result.success) {
    throw new Error(result.error);
  }
}
