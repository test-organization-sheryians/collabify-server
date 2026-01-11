import { logger } from "@/shared/logger";

export const sendToConsole = async (
  to: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> => {
  logger.info(
    {
      type: "PUSH_MOCK",
      toCount: to.length,
      title,
      body,
      data,
    },
    "📱 Mock Push Notification Sent"
  );
};
