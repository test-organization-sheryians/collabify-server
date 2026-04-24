import nodemailer from "nodemailer";
import { env } from "@/shared/config/env";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("services:email-provider:nodemailer");

/** Lazily-created singleton transporter — one connection per process. */
let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE, // true for port 465, false for 587
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });

  return _transporter;
}

export async function sendWithNodemailer(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    logger.info("Email sent successfully via Nodemailer", {
      to,
      subject,
      provider: "nodemailer",
    });
    return { success: true };
  } catch (error) {
    // Never expose SMTP errors to client — log for debugging
    logger.error("Failed to send email via Nodemailer", {
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
