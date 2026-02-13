import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("services:providers");

export const sendToConsole = (
  to: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> => {
  logger.info("📱 Mock Push Notification Sent", {
    type: "PUSH_MOCK",
    toCount: to.length,
    title,
    body,
    data,
  });
  return Promise.resolve();
};
