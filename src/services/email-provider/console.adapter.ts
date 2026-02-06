import { logger } from "@/shared/logger";

export const sendToConsole = (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  logger.info(
    {
      type: "EMAIL_MOCK",
      to,
      subject,
      htmlPreview: html.substring(0, 100) + "...",
    },
    "📧 Mock Email Sent"
  );
  return Promise.resolve();
};
