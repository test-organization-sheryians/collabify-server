/**
 * updateProjectNotifPrefs — Service Handler
 *
 * Handles project-scoped notification preference overrides.
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/infra/db";
import type { UpdateProjectNotifPrefsInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import * as prefWriter from "@/modules/notification/shared/preferences/preference-writer";
import * as prefCache from "@/modules/notification/shared/preferences/preference-cache";
import { ALL_CATEGORIES, categoryDefaults } from "@/modules/notification/shared/preferences/preference-defaults";
import type { NotificationCategory } from "@/modules/notification/events/types";

const log = createLogger("project:services:update-project-notif-prefs");

export const updateProjectNotifPrefs = async (
  input: UpdateProjectNotifPrefsInput,
  _ctx: ServiceContext
) => {
  const { userId, projectId, ...rest } = input;

  // Verify membership
  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) throw AppError.forbidden("User is not a member of this project");

  await prefWriter.updateProject(userId, projectId, rest);

  const fresh = await prefCache.getProject(userId, projectId);
  if (!fresh) throw new Error("Failed to load project preferences after update");

  const categories = ALL_CATEGORIES.map((cat) => {
    const s = fresh.categories[cat as NotificationCategory] ?? categoryDefaults[cat as NotificationCategory];
    return { category: cat, email: s.email, push: s.push, inApp: s.inApp };
  });

  log.debug("Project notif prefs updated", { userId, projectId });

  return {
    emailEnabled: fresh.emailEnabled,
    pushEnabled:  fresh.pushEnabled,
    categories,
  };
};
