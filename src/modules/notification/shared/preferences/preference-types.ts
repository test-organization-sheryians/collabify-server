import type { NotificationCategory, Channel } from "../../events/types";

// =============================================================================
// Preference Types
//
// All interfaces used by the preference cache, writer, and resolver.
// Mirrors the DB schema shapes but is designed for cache-friendliness
// (flat, JSON-serializable, no Prisma model instances).
// =============================================================================

// -----------------------------------------------------------------------------
// Cache Value Shapes (serialized into Redis as JSON)
// -----------------------------------------------------------------------------

export interface CategorySetting {
  email: boolean;
  push:  boolean;
  inApp: boolean;
}

/** Stored at: `notif:pref:global:{userId}` */
export interface GlobalPreference {
  emailEnabled: boolean;
  pushEnabled:  boolean;
  inAppEnabled: boolean;
  globalMode:   GlobalNotifMode;
  muteUntil:    string | null; // ISO string or null
  categories:   Record<NotificationCategory, CategorySetting>;
  cachedAt:     number; // epoch ms — used for stale-while-revalidate if needed
}

/**
 * Stored at:
 *   `notif:pref:ws:{userId}:{workspaceId}`
 *   `notif:pref:proj:{userId}:{projectId}`
 *
 * null fields mean "inherit from parent scope" (they were never set).
 */
export interface ScopedPreference {
  emailEnabled: boolean | null;
  pushEnabled:  boolean | null;
  inAppEnabled: boolean | null;
  muteUntil:    string | null;
  categories:   Partial<Record<NotificationCategory, Partial<CategorySetting>>>;
  cachedAt:     number;
}

/** Stored at: `notif:pref:conv:{userId}:{conversationId}` */
export interface ConversationPreference {
  mode:         ConversationNotifMode;
  muteUntil:    string | null;
  pushEnabled:  boolean | null; // null = inherit from global/workspace/project
  emailEnabled: boolean | null;
  cachedAt:     number;
}

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type GlobalNotifMode =
  | "ALL"           // Layer 1: "All messages"
  | "MENTIONS_ONLY" // Layer 1: "Only Mentions"
  | "NOTHING";      // Layer 1: "None / Paused"

export type ConversationNotifMode =
  | "ALL_MESSAGES"
  | "MENTIONS_ONLY"
  | "NOTHING";

// -----------------------------------------------------------------------------
// Context passed to PreferenceResolver from the Decider
// -----------------------------------------------------------------------------

export interface NotificationContext {
  workspaceId?:      string;
  projectId?:        string;
  conversationId?:   string;
  conversationType?: "CHANNEL" | "DM" | "GROUP_DM" | "THREAD";
}

// -----------------------------------------------------------------------------
// Resolution Output
// -----------------------------------------------------------------------------

export interface PreferenceResolution {
  /** Whether to deliver the notification at all. */
  deliver:        boolean;
  /** Which channels should receive delivery (after all filters applied). */
  activeChannels: Channel[];
  /** Human-readable reason for non-delivery. Present only when deliver=false. */
  reason?:        DropReason;
}

export type DropReason =
  | "GLOBAL_PAUSE"
  | "GLOBAL_MENTIONS_ONLY"
  | "MUTED_WORKSPACE"
  | "MUTED_WORKSPACE_TEMP"
  | "MUTED_PROJECT"
  | "MUTED_PROJECT_TEMP"
  | "MUTED_CONVERSATION"
  | "MUTED_CONVERSATION_TEMP"
  | "MENTIONS_ONLY_MODE"
  | "CHANNEL_DISABLED"
  | "ALL_CHANNELS_DISABLED"
  | "CATEGORY_DISABLED"
  | "PREFERENCES_SKIPPED";
