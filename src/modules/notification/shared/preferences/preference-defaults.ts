import type { NotificationCategory, Channel } from "../../events/types";

// =============================================================================
// Preference Defaults
//
// System defaults applied when no NotificationPreference record exists for
// a user + category + scope combination. Covers new users, new categories
// added after a user registered, and Redis/DB miss edge cases.
//
// These are the defaults a user SEES on first login before ever touching
// the Notification Settings page — choose sensible, low-noise values.
//
// Rule: email is off for high-frequency/passive events.
//       push is on for actionable events that need immediacy.
//       inApp is ALWAYS on — it is the reliability channel.
// =============================================================================

export interface CategoryDefault {
  email: boolean;
  push:  boolean;
  inApp: boolean;
}

export const categoryDefaults: Record<NotificationCategory, CategoryDefault> = {
  // High-frequency chat events — email would be extreme noise
  chat_messages: { email: false, push: true,  inApp: true },

  // Mentions always get all channels — the user was explicitly addressed
  mentions:      { email: true,  push: true,  inApp: true },

  // Reactions are passive — in-app only is appropriate
  reactions:     { email: false, push: false, inApp: true },

  // Assignments are productivity-critical — all channels on
  assignments:   { email: true,  push: true,  inApp: true },

  // Deadlines need urgency — all channels on
  deadlines:     { email: true,  push: true,  inApp: true },

  // Access changes are security-relevant — email + inApp (no push spam)
  access_changes:{ email: true,  push: false, inApp: true },

  // Collaboration (added/removed from docs etc.) — low-noise
  collaboration: { email: false, push: false, inApp: true },

  // System events (billing, plan limits) — email + inApp
  system_admin:  { email: true,  push: false, inApp: true },
};

/** Global channel defaults — applied before per-category settings. */
export const globalChannelDefaults = {
  emailEnabled: true,
  pushEnabled:  true,
  inAppEnabled: true, // Never disabled by default — reliability channel
};

/** Returns the default channels for a category. Always returns a value — never null. */
export function getDefault(category: NotificationCategory): CategoryDefault {
  return categoryDefaults[category] ?? { email: false, push: false, inApp: true };
}

/** Ordered list of all valid notification categories. */
export const ALL_CATEGORIES: NotificationCategory[] = Object.keys(
  categoryDefaults
) as NotificationCategory[];
