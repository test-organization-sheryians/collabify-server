import { db } from "@/infra/db";
import { NotificationChannel } from "../../core/types";
import { NotificationPreference } from "@prisma/client";

interface Strategy {
  batching?: {
    enabled?: boolean;
    windowMs?: number;
  };
  skipPreferences?: boolean;
}

// -----------------------------------------------------------------------------
// BATCHING DECISION
// -----------------------------------------------------------------------------
export const shouldBatch = (
  type: string,
  strategy: Strategy
): { enabled: boolean; delay?: number } => {
  if (strategy.batching?.enabled) {
    // If it's ALREADY a summary event, skip batching
    if (!type.endsWith(".summary")) {
      return {
        enabled: true,
        delay: strategy.batching.windowMs || 300000,
      };
    }
  }
  return { enabled: false };
};

// -----------------------------------------------------------------------------
// PREFERENCE LAZY LOAD
// -----------------------------------------------------------------------------
export const getPreferences = async (
  userId: string,
  strategy: Strategy
): Promise<NotificationPreference | null> => {
  if (strategy.skipPreferences) return null;

  return await db.notificationPreference.findFirst({
    where: { userId },
  });
};

// -----------------------------------------------------------------------------
// CHANNEL FILTERING
// -----------------------------------------------------------------------------
export const isChannelEnabled = (
  channel: NotificationChannel,
  preferences: NotificationPreference | null,
  strategy: Strategy
): boolean => {
  if (strategy.skipPreferences) return true;
  if (!preferences) return true; // Default to TRUE if no prefs

  switch (channel) {
    case NotificationChannel.EMAIL:
      return preferences.emailEnabled;
    case NotificationChannel.PUSH:
      return preferences.pushEnabled;
    case NotificationChannel.IN_APP:
      return preferences.inAppEnabled;
    case NotificationChannel.SMS:
      return false; // SMS not supported yet
    default:
      return true;
  }
};
