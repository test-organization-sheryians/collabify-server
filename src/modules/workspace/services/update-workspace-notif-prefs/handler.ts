/**
 * updateWorkspaceNotifPrefs — Service Handler
 *
 * Handles workspace-scoped notification preference overrides.
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/infra/db";
import type { UpdateWorkspaceNotifPrefsInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import * as prefWriter from "@/modules/notification/shared/preferences/preference-writer";
import * as prefCache from "@/modules/notification/shared/preferences/preference-cache";
import { ALL_CATEGORIES, categoryDefaults } from "@/modules/notification/shared/preferences/preference-defaults";
import type { NotificationCategory } from "@/modules/notification/events/types";

const log = createLogger("workspace:services:update-workspace-notif-prefs");

export const updateWorkspaceNotifPrefs = async (
  input: UpdateWorkspaceNotifPrefsInput,
  _ctx: ServiceContext
) => {
  const { userId, workspaceId, ...rest } = input;

  // Verify membership
  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!membership) throw AppError.forbidden("User is not a member of this workspace");

  await prefWriter.updateWorkspace(userId, workspaceId, rest);

  const fresh = await prefCache.getWorkspace(userId, workspaceId);
  if (!fresh) throw new Error("Failed to load workspace preferences after update");

  const categories = ALL_CATEGORIES.map((cat) => {
    const s = fresh.categories[cat as NotificationCategory] ?? categoryDefaults[cat as NotificationCategory];
    return { category: cat, email: s.email, push: s.push, inApp: s.inApp };
  });

  log.debug("Workspace notif prefs updated", { userId, workspaceId });

  return {
    emailEnabled: fresh.emailEnabled,
    pushEnabled:  fresh.pushEnabled,
    categories,
  };
};
