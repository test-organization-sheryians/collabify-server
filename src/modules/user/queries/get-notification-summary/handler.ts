/**
 * getNotificationSummary — Query Handler
 *
 * Returns the current user's global notification preferences.
 * Feeds the Layer 1 + 2 notification settings UI.
 */
import type { GetNotificationSummaryInput, NotificationSummaryOutput } from "./types";
import * as prefCache from "@/modules/notification/shared/preferences/preference-cache";
import { ALL_CATEGORIES, categoryDefaults } from "@/modules/notification/shared/preferences/preference-defaults";
import type { NotificationCategory } from "@/modules/notification/events/types";

export const getNotificationSummary = async (
  input: GetNotificationSummaryInput
): Promise<NotificationSummaryOutput> => {
  const { userId } = input;

  const global = await prefCache.getGlobal(userId);

  const categories = ALL_CATEGORIES.map((cat) => {
    const s = global.categories[cat as NotificationCategory] ?? categoryDefaults[cat as NotificationCategory];
    return { category: cat, email: s.email, push: s.push, inApp: s.inApp };
  });

  const isDndActive = global.muteUntil
    ? new Date(global.muteUntil).getTime() > Date.now()
    : false;

  return {
    globalMode:   global.globalMode,
    emailEnabled: global.emailEnabled,
    pushEnabled:  global.pushEnabled,
    isDndActive,
    dndUntil:     isDndActive ? global.muteUntil : null,
    categories,
  };
};
