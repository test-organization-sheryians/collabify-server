import { Resend } from "resend";
import { env } from "@/shared/config/env";
import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";

const logger = createLogger("services:providers");

const resend = new Resend(env.RESEND_API_KEY);

export const sendWithResend = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  try {
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    if (error) {
      throw error;
    }

    logger.info("Email sent successfully via Resend", {
      to,
      subject,
      provider: "Resend",
    });
  } catch (error) {
    logger.error("Failed to send email via Resend", { error, to, subject });
    throw new AppError(
      "Failed to send email via Resend",
      "NOTIFICATION_PROVIDER_ERROR",
      502,
      true,
      { originalError: error }
    );
  }
};
