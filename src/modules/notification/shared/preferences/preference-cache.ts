import { redis } from "@/infra/redis";
import { db } from "@/infra/db";
import { REDIS_KEYS, TTL } from "../../constants";
import { globalChannelDefaults, categoryDefaults } from "./preference-defaults";
import { createLogger } from "@/shared/lib/logger";
import type {
  GlobalPreference,
  ScopedPreference,
  ConversationPreference,
} from "./preference-types";
import type { NotificationCategory } from "../../events/types";

// =============================================================================
// Preference Cache
//
// Redis-only, two-step: Redis GET → DB fallback (write-through back to Redis).
//
// Why Redis-only (no in-process LRU):
//   - Redis GET is ~0.3ms — negligible vs DB write latency in channel workers.
//   - Redis is shared across all server instances — no cross-instance stale state.
//   - No extra dependency, no pub/sub invalidation broadcast needed.
//   - If user updates prefs, cache.invalidate() + next read gets fresh data.
//
// Key structure:
//   global:    notif:pref:global:{userId}
//   workspace: notif:pref:ws:{userId}:{workspaceId}
//   project:   notif:pref:proj:{userId}:{projectId}
//   conv:      notif:pref:conv:{userId}:{conversationId}
// =============================================================================

const logger = createLogger("notification:shared:preference-cache");

// -----------------------------------------------------------------------------
// GET — Global
// -----------------------------------------------------------------------------

export async function getGlobal(userId: string): Promise<GlobalPreference> {
  const key = `${REDIS_KEYS.PREF_GLOBAL_PREFIX}${userId}`;
  return getOrLoad(key, TTL.PREF_GLOBAL, () => loadGlobalFromDb(userId));
}

// -----------------------------------------------------------------------------
// GET — Workspace scope
// -----------------------------------------------------------------------------

export async function getWorkspace(
  userId:      string,
  workspaceId: string
): Promise<ScopedPreference | null> {
  const key = `${REDIS_KEYS.PREF_WORKSPACE_PREFIX}${userId}:${workspaceId}`;
  return getOrLoadNullable(key, TTL.PREF_WORKSPACE, () =>
    loadScopedFromDb(userId, { workspaceId })
  );
}

// -----------------------------------------------------------------------------
// GET — Project scope
// -----------------------------------------------------------------------------

export async function getProject(
  userId:    string,
  projectId: string
): Promise<ScopedPreference | null> {
  const key = `${REDIS_KEYS.PREF_PROJECT_PREFIX}${userId}:${projectId}`;
  return getOrLoadNullable(key, TTL.PREF_PROJECT, () =>
    loadScopedFromDb(userId, { projectId })
  );
}

// -----------------------------------------------------------------------------
// GET — Conversation scope
// -----------------------------------------------------------------------------

export async function getConversation(
  userId:         string,
  conversationId: string
): Promise<ConversationPreference | null> {
  const key = `${REDIS_KEYS.PREF_CONV_PREFIX}${userId}:${conversationId}`;
  return getOrLoadNullable(key, TTL.PREF_CONV, () =>
    loadConversationFromDb(userId, conversationId)
  );
}

// -----------------------------------------------------------------------------
// INVALIDATE — called by PreferenceWriter after any DB update
// -----------------------------------------------------------------------------

/**
 * Delete a specific scope key from Redis.
 * Next read will fall through to DB and rebuild the cache automatically.
 */
export async function invalidate(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (err) {
    // Non-fatal: stale cache will expire via TTL
    logger.warn("Preference cache: invalidation failed", { err, key });
  }
}

/**
 * Build the Redis key for a given scope (used by PreferenceWriter for targeted invalidation).
 */
export const keys = {
  global:      (userId: string)                            => `${REDIS_KEYS.PREF_GLOBAL_PREFIX}${userId}`,
  workspace:   (userId: string, workspaceId: string)      => `${REDIS_KEYS.PREF_WORKSPACE_PREFIX}${userId}:${workspaceId}`,
  project:     (userId: string, projectId: string)        => `${REDIS_KEYS.PREF_PROJECT_PREFIX}${userId}:${projectId}`,
  conversation:(userId: string, conversationId: string)   => `${REDIS_KEYS.PREF_CONV_PREFIX}${userId}:${conversationId}`,
};

// -----------------------------------------------------------------------------
// Generic cache helpers
// -----------------------------------------------------------------------------

async function getOrLoad<T>(
  key:     string,
  ttl:     number,
  loader:  () => Promise<T>
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as T;
  } catch (err) {
    logger.warn("Preference cache: Redis GET failed, falling back to DB", { err, key });
  }

  const value = await loader();
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttl);
  } catch (err) {
    logger.warn("Preference cache: Redis SET failed (will re-load next time)", { err, key });
  }
  return value;
}

async function getOrLoadNullable<T>(
  key:     string,
  ttl:     number,
  loader:  () => Promise<T | null>
): Promise<T | null> {
  try {
    const cached = await redis.get(key);
    if (cached === "null") return null;       // explicitly cached as "not set"
    if (cached)            return JSON.parse(cached) as T;
  } catch (err) {
    logger.warn("Preference cache: Redis GET failed", { err, key });
  }

  const value = await loader();
  try {
    // Cache null as the string "null" to prevent DB hammering for non-existent prefs
    await redis.set(key, value === null ? "null" : JSON.stringify(value), "EX", ttl);
  } catch (err) {
    logger.warn("Preference cache: Redis SET failed", { err, key });
  }
  return value;
}

// -----------------------------------------------------------------------------
// DB Loaders — called only on cache miss
// -----------------------------------------------------------------------------

async function loadGlobalFromDb(userId: string): Promise<GlobalPreference> {
  const rows = await db.notificationPreference.findMany({
    where: { userId, workspaceId: null, projectId: null },
  });

  // Build category settings map from DB rows
  const categories: any = {};
  for (const row of rows) {
    if (row.categoryKey) {
      categories[row.categoryKey as NotificationCategory] = {
        email: row.emailEnabled,
        push:  row.pushEnabled,
        inApp: row.inAppEnabled,
      };
    }
  }

  // Ensure ALL categories have at least the system defaults
  for (const cat of Object.keys(categoryDefaults)) {
    if (!categories[cat]) {
      categories[cat] = categoryDefaults[cat as NotificationCategory];
    }
  }

  // Use global channel defaults as base (individual row overrides if present)
  const globalRow = rows.find((r) => !r.categoryKey) ?? null;

  return {
    emailEnabled: globalRow?.emailEnabled ?? globalChannelDefaults.emailEnabled,
    pushEnabled:  globalRow?.pushEnabled  ?? globalChannelDefaults.pushEnabled,
    inAppEnabled: globalRow?.inAppEnabled ?? globalChannelDefaults.inAppEnabled,
    globalMode:   (globalRow?.globalMode as any) ?? "ALL",
    muteUntil:    globalRow?.muteUntil ? (globalRow.muteUntil as Date).toISOString() : null,
    categories,
    cachedAt:     Date.now(),
  };
}

async function loadScopedFromDb(
  userId: string,
  scope:  { workspaceId?: string; projectId?: string }
): Promise<ScopedPreference | null> {
  const rows = await db.notificationPreference.findMany({
    where: {
      userId,
      workspaceId: scope.workspaceId ?? null,
      projectId:   scope.projectId   ?? null,
    },
  });

  if (rows.length === 0) return null;

  const categories: Partial<Record<NotificationCategory, Partial<{ email: boolean; push: boolean; inApp: boolean }>>> = {};
  for (const row of rows) {
    categories[row.categoryKey as NotificationCategory] = {
      email: row.emailEnabled,
      push:  row.pushEnabled,
      inApp: row.inAppEnabled,
    };
  }

  const baseRow = rows[0];
  return {
    emailEnabled: baseRow?.emailEnabled ?? null,
    pushEnabled:  baseRow?.pushEnabled  ?? null,
    inAppEnabled: baseRow?.inAppEnabled ?? null,
    muteUntil:    baseRow?.muteUntil ? (baseRow.muteUntil as Date).toISOString() : null,
    categories,
    cachedAt:     Date.now(),
  };
}

async function loadConversationFromDb(
  userId:         string,
  conversationId: string
): Promise<ConversationPreference | null> {
  const row = await db.conversationNotificationPreference.findUnique({
    where: { userId_conversationId: { userId, conversationId } },
  }).catch(() => null);

  if (!row) return null;

  return {
    mode:         row.mode,
    muteUntil:    row.muteUntil ? (row.muteUntil as Date).toISOString() : null,
    pushEnabled:  row.pushEnabled  ?? null,
    emailEnabled: row.emailEnabled ?? null,
    cachedAt:     Date.now(),
  };
}
