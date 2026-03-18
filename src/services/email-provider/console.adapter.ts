import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("services:email-provider:console");

export const sendToConsole = (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  logger.info("📧 Mock Email Sent", {
    type: "EMAIL_MOCK",
    to,
    subject,
    htmlPreview: html.substring(0, 100) + "...",
  });
  return Promise.resolve();
};
