import nodemailer from "nodemailer";
import { env } from "@/shared/config/env";
import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";

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

export const sendWithNodemailer = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
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
  } catch (error) {
    logger.error("Failed to send email via Nodemailer", { error, to, subject });
    throw new AppError(
      "Failed to send email via Nodemailer",
      "NOTIFICATION_PROVIDER_ERROR",
      502,
      true,
      { originalError: error }
    );
  }
};
