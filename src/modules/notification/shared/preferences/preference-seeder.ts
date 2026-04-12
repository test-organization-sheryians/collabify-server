import { db } from "@/infra/db";
import { ALL_CATEGORIES, categoryDefaults } from "./preference-defaults";
import { createLogger } from "@/shared/lib/logger";

// =============================================================================
// Preference Seeder
//
// Called once when a new user is created. Inserts a NotificationPreference row
// for every category at the global scope using system defaults.
//
// Why seed upfront:
//   - Ensures preference-cache.ts always finds rows on cache miss.
//   - The user's Settings page shows meaningful defaults immediately.
//   - Eliminates null-handling branches in the preference resolver.
//
// Uses createMany with skipDuplicates — safe to call multiple times.
// =============================================================================

const logger = createLogger("notification:shared:preference-seeder");

export async function seedDefaults(userId: string): Promise<void> {
  const rows = ALL_CATEGORIES.map((category) => {
    const defaults = categoryDefaults[category];
    return {
      userId,
      workspaceId: null,
      projectId:   null,
      categoryKey: category,
      emailEnabled: defaults.email,
      pushEnabled:  defaults.push,
      inAppEnabled: defaults.inApp,
    };
  });

  try {
    await db.notificationPreference.createMany({
      data:           rows,
      skipDuplicates: true, // idempotent
    });

    logger.debug("Preference seeder: seeded defaults for user", {
      userId,
      categories: rows.length,
    });
  } catch (err) {
    // Non-fatal — user can still use the app, defaults will apply via fallback
    logger.error("Preference seeder: failed to seed defaults", { err, userId });
  }
}
