/**
 * updateGlobalNotifPrefs — Service Handler
 *
 * Handles all Layer 1 + Layer 2 global preference mutations:
 *   - updateGlobalNotifPrefs: full update (categories + channel toggles + mode)
 *   - setGlobalNotifMode: sets globalMode only
 *   - pauseNotifications: sets muteUntil
 *   - resumeNotifications: clears muteUntil
 *
 * Delegates all DB writes to notification/shared/preference-writer.
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { UpdateGlobalNotifPrefsInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import * as prefWriter from "@/modules/notification/shared/preferences/preference-writer";
import * as prefCache from "@/modules/notification/shared/preferences/preference-cache";
import { ALL_CATEGORIES, categoryDefaults } from "@/modules/notification/shared/preferences/preference-defaults";
import type { NotificationCategory } from "@/modules/notification/events/types";

const log = createLogger("user:services:update-global-notif-prefs");

export const updateGlobalNotifPrefs = async (
  input: UpdateGlobalNotifPrefsInput,
  _ctx: ServiceContext
) => {
  const { userId, muteUntil, ...rest } = input;

  await prefWriter.updateGlobal(userId, {
    ...rest,
    muteUntil: muteUntil ? new Date(muteUntil) : muteUntil === null ? null : undefined,
  });

  const fresh = await prefCache.getGlobal(userId);
  const categories = ALL_CATEGORIES.map((cat) => {
    const s = fresh.categories[cat as NotificationCategory] ?? categoryDefaults[cat as NotificationCategory];
    return { category: cat, email: s.email, push: s.push, inApp: s.inApp };
  });

  const isDndActive = fresh.muteUntil
    ? new Date(fresh.muteUntil).getTime() > Date.now()
    : false;

  log.debug("Global notif prefs updated", { userId });

  return {
    emailEnabled: fresh.emailEnabled,
    pushEnabled:  fresh.pushEnabled,
    inAppEnabled: fresh.inAppEnabled,
    globalMode:   fresh.globalMode,
    isDndActive,
    dndUntil:     isDndActive ? fresh.muteUntil : null,
    categories,
  };
};
