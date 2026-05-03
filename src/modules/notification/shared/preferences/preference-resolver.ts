import * as cache from "./preference-cache";
import { getDefault } from "./preference-defaults";
import { createLogger } from "@/shared/lib/logger";
import type { EventDefinition, Channel } from "../../events/types";
import type {
  NotificationContext,
  PreferenceResolution,
  GlobalPreference,
  ScopedPreference,
  ConversationPreference,
} from "./preference-types";

// =============================================================================
// Preference Resolver
//
// The single, centralized decision point for "should this notification be
// delivered, and to which channels?"
//
// Called ONCE per DeciderJob, AFTER recipient resolution and BEFORE dispatch.
// No other component in the system may make delivery decisions independently.
//
// Resolution algorithm (in order):
//   1. Skip entirely for system events (skipPreferences=true).
//   2. Load all scope prefs in parallel (Redis → DB fallback).
//   3. Mute check at workspace scope (overrideMute events bypass).
//   4. Mute check at project scope.
//   5. Conversation mode filter (NOTHING blocks; MENTIONS_ONLY filters).
//   6. Per-channel enablement merge (global is hard ceiling).
//   7. Presence filter (online → REALTIME+IN_APP; offline → EMAIL+PUSH+IN_APP).
//   8. Return PreferenceResolution.
//
// Anti-patterns prevented:
//   - No event-type checks (if type === '...') inside this file.
//   - No DB calls (cache handles that).
//   - No side effects.
// =============================================================================

const logger = createLogger("notification:shared:preference-resolver");

/**
 * Resolve whether to deliver a notification and which channels to use.
 *
 * @param userId     - The recipient's user ID.
 * @param definition - The EventDefinition for this notification type.
 * @param context    - Workspace/project/conversation context of the event.
 * @param isOnline   - Whether the user has an active WS session (from PresenceChecker).
 */
export async function resolve(
  userId:     string,
  definition: EventDefinition,
  context:    NotificationContext,
  isOnline:   boolean
): Promise<PreferenceResolution> {

  // ── Step 1: System events bypass all preferences ──────────────────────────
  if (definition.skipPreferences) {
    return {
      deliver:        true,
      activeChannels: filterByPresence(definition.channels, isOnline),
    };
  }

  // ── Step 2: Load all scopes in parallel ───────────────────────────────────
  const [global, workspace, project, conversation] = await Promise.all([
    cache.getGlobal(userId),
    context.workspaceId    ? cache.getWorkspace(userId, context.workspaceId)       : null,
    context.projectId      ? cache.getProject(userId, context.projectId)           : null,
    context.conversationId ? cache.getConversation(userId, context.conversationId) : null,
  ]);

  // ── Step 2.1: Global Mode & DND Check ─────────────────────────────────────
  if (!definition.overrideMute) {
    if (global.globalMode === "NOTHING") {
      return drop("GLOBAL_PAUSE");
    }

    if (global.muteUntil && new Date(global.muteUntil) > new Date()) {
      return drop("GLOBAL_PAUSE");
    }

    if (global.globalMode === "MENTIONS_ONLY") {
      // definition.overrideMute=true handles mentions/assignments
      // definition.overrideMute=false handled here: drop non-mentions
      return drop("GLOBAL_MENTIONS_ONLY");
    }
  }

  // ── Step 3: Workspace mute check ──────────────────────────────────────────
  if (!definition.overrideMute && workspace?.muteUntil) {
    if (new Date(workspace.muteUntil) > new Date()) {
      return drop("MUTED_WORKSPACE_TEMP");
    }
  }

  // ── Step 4: Project mute check ────────────────────────────────────────────
  if (!definition.overrideMute && project?.muteUntil) {
    if (new Date(project.muteUntil) > new Date()) {
      return drop("MUTED_PROJECT_TEMP");
    }
  }

  // ── Step 5: Conversation mode filter ──────────────────────────────────────
  if (conversation) {
    // Temporary mute (muteUntil overrides mode)
    if (!definition.overrideMute && conversation.muteUntil) {
      if (new Date(conversation.muteUntil) > new Date()) {
        return drop("MUTED_CONVERSATION_TEMP");
      }
    }

    if (conversation.mode === "NOTHING" && !definition.overrideMute) {
      return drop("MUTED_CONVERSATION");
    }

    if (conversation.mode === "MENTIONS_ONLY" && !definition.overrideMute) {
      // Events with overrideMute=true are mention-class → they never enter this
      // branch (the outer !definition.overrideMute guard prevents it).
      // DMs always deliver regardless of mode.
      const isDM = context.conversationType === "DM";
      if (!isDM) {
        return drop("MENTIONS_ONLY_MODE");
      }
    }
  }

  // ── Step 6: Per-channel enablement merge ──────────────────────────────────
  // Global is the hard ceiling. Lower scopes can only restrict, not expand.
  const category = definition.category;
  const catDefault = getDefault(category);

  // Resolve per-category settings at each scope
  const globalCat  = global.categories[category]     ?? catDefault;
  const wsCat      = workspace?.categories?.[category];
  const projCat    = project?.categories?.[category];

  const effective = {
    email: (global.emailEnabled ?? true)
        && (globalCat.email ?? true)
        && (workspace?.emailEnabled ?? true)
        && (wsCat?.email    ?? true)
        && (project?.emailEnabled   ?? true)
        && (projCat?.email  ?? true)
        && (conversation?.emailEnabled ?? true),

    push:  (global.pushEnabled ?? true)
        && (globalCat.push ?? true)
        && (workspace?.pushEnabled  ?? true)
        && (wsCat?.push    ?? true)
        && (project?.pushEnabled    ?? true)
        && (projCat?.push  ?? true)
        && (conversation?.pushEnabled ?? true),

    inApp: (global.inAppEnabled ?? true)
        && (globalCat.inApp ?? true),
  };

  // ── Step 7: Filter definition.channels by effective prefs + presence ──────
  const eligibleChannels = definition.channels.filter((ch: Channel) => {
    switch (ch) {
      case "EMAIL":    return effective.email;
      case "PUSH":     return effective.push;
      case "IN_APP":   return effective.inApp;
      case "REALTIME": return true; // always eligible; filtered by presence below
      default:         return true;
    }
  });

  const activeChannels = filterByPresence(eligibleChannels, isOnline);

  // ── Step 8: Final deliver decision ────────────────────────────────────────
  if (activeChannels.length === 0) {
    logger.debug("Preference resolver: all channels disabled for user", {
      userId,
      type: definition.type,
    });
    return drop("ALL_CHANNELS_DISABLED");
  }

  return { deliver: true, activeChannels };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function drop(reason: PreferenceResolution["reason"]): PreferenceResolution {
  return { deliver: false, activeChannels: [], reason };
}

/**
 * Filter channels by user's online presence.
 *
 * Online:  REALTIME + IN_APP only.
 *          Email and push would be noisy interruptions while the user is active.
 * Offline: EMAIL + PUSH + IN_APP.
 *          REALTIME is useless with no socket — skip it.
 */
function filterByPresence(channels: Channel[], isOnline: boolean): Channel[] {
  if (isOnline) {
    return channels.filter((ch) => ch === "REALTIME" || ch === "IN_APP");
  }
  return channels.filter((ch) => ch !== "REALTIME");
}
