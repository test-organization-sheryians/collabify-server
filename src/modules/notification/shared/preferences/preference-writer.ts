import { db } from "@/infra/db";
import { invalidate, keys } from "./preference-cache";
import { createLogger } from "@/shared/lib/logger";
import type { NotificationCategory } from "../../events/types";
import type { ConversationNotifMode } from "./preference-types";

// =============================================================================
// Preference Writer
//
// All preference mutations go through here. Handles:
//   1. DB upsert (source of truth)
//   2. Redis cache invalidation (delete → next read rebuilds automatically)
//
// No pub/sub needed because Redis is shared state — invalidation on one
// instance is immediately visible to all other instances on next read.
// =============================================================================

const logger = createLogger("notification:shared:preference-writer");

// -----------------------------------------------------------------------------
// Update global preferences
// -----------------------------------------------------------------------------

export async function updateGlobal(
  userId: string,
  input: {
    emailEnabled?: boolean;
    pushEnabled?:  boolean;
    inAppEnabled?: boolean;
    globalMode?:   string; // string for DB
    muteUntil?:    Date | null;
    categories?:   Array<{
      category:    NotificationCategory;
      email:       boolean;
      push:        boolean;
      inApp:       boolean;
    }>;
  }
): Promise<void> {
  if (input.categories?.length) {
    await Promise.all(
      input.categories.map((cat) =>
        db.notificationPreference.upsert({
          where: {
            userId_workspaceId_projectId_categoryKey: {
              userId,
              workspaceId:  null as unknown as string,
              projectId:    null as unknown as string,
              categoryKey:  cat.category,
            },
          },
          update: { emailEnabled: cat.email, pushEnabled: cat.push, inAppEnabled: cat.inApp },
          create: {
            userId,
            workspaceId:  null,
            projectId:    null,
            categoryKey:  cat.category,
            emailEnabled: cat.email,
            pushEnabled:  cat.push,
            inAppEnabled: cat.inApp,
          },
        })
      )
    );
  }

  const { categories, ...baseFields } = input;
  if (Object.keys(baseFields).length > 0) {
    await db.notificationPreference.upsert({
      where: {
        userId_workspaceId_projectId_categoryKey: {
          userId,
          workspaceId: null as unknown as string,
          projectId:   null as unknown as string,
          categoryKey: "",
        },
      },
      update: baseFields,
      create: { ...baseFields, userId, workspaceId: null, projectId: null, categoryKey: "" },
    });
  }

  await invalidate(keys.global(userId));
  logger.debug("Preference writer: global prefs updated + cache invalidated", { userId });
}

// -----------------------------------------------------------------------------
// Update workspace-scoped preferences
// -----------------------------------------------------------------------------

export async function updateWorkspace(
  userId:      string,
  workspaceId: string,
  input: {
    emailEnabled?: boolean | null;
    pushEnabled?:  boolean | null;
    muteUntil?:    Date | null;
    categories?:   Array<{
      category: NotificationCategory;
      email:    boolean;
      push:     boolean;
      inApp:    boolean;
    }>;
  }
): Promise<void> {
  if (input.categories?.length) {
    await Promise.all(
      input.categories.map((cat) =>
        db.notificationPreference.upsert({
          where: {
            userId_workspaceId_projectId_categoryKey: {
              userId,
              workspaceId,
              projectId:   null as unknown as string,
              categoryKey: cat.category,
            },
          },
          update: { emailEnabled: cat.email, pushEnabled: cat.push, inAppEnabled: cat.inApp },
          create: { userId, workspaceId, projectId: null, categoryKey: cat.category, emailEnabled: cat.email, pushEnabled: cat.push, inAppEnabled: cat.inApp },
        })
      )
    );
  }

  const baseFields: any = {};
  if (input.emailEnabled != null) baseFields.emailEnabled = input.emailEnabled;
  if (input.pushEnabled != null) baseFields.pushEnabled = input.pushEnabled;
  if (input.muteUntil !== undefined) baseFields.muteUntil = input.muteUntil;

  if (Object.keys(baseFields).length > 0) {
    await db.notificationPreference.upsert({
      where: {
        userId_workspaceId_projectId_categoryKey: {
          userId,
          workspaceId,
          projectId:   null as unknown as string,
          categoryKey: "",
        },
      },
      update: baseFields,
      create: { ...baseFields, userId, workspaceId, projectId: null, categoryKey: "" },
    });
  }

  await invalidate(keys.workspace(userId, workspaceId));
  logger.debug("Preference writer: workspace prefs updated", { userId, workspaceId });
}

// -----------------------------------------------------------------------------
// Update project-scoped preferences
// -----------------------------------------------------------------------------

export async function updateProject(
  userId:    string,
  projectId: string,
  input: {
    emailEnabled?: boolean | null;
    pushEnabled?:  boolean | null;
    muteUntil?:    Date | null;
    categories?:   Array<{
      category: NotificationCategory;
      email:    boolean;
      push:     boolean;
      inApp:    boolean;
    }>;
  }
): Promise<void> {
  if (input.categories?.length) {
    await Promise.all(
      input.categories.map((cat) =>
        db.notificationPreference.upsert({
          where: {
            userId_workspaceId_projectId_categoryKey: {
              userId,
              workspaceId: null as unknown as string,
              projectId,
              categoryKey: cat.category,
            },
          },
          update: { emailEnabled: cat.email, pushEnabled: cat.push, inAppEnabled: cat.inApp },
          create: { userId, workspaceId: null, projectId, categoryKey: cat.category, emailEnabled: cat.email, pushEnabled: cat.push, inAppEnabled: cat.inApp },
        })
      )
    );
  }

  const baseFields: any = {};
  if (input.emailEnabled != null) baseFields.emailEnabled = input.emailEnabled;
  if (input.pushEnabled != null) baseFields.pushEnabled = input.pushEnabled;
  if (input.muteUntil !== undefined) baseFields.muteUntil = input.muteUntil;

  if (Object.keys(baseFields).length > 0) {
    await db.notificationPreference.upsert({
      where: {
        userId_workspaceId_projectId_categoryKey: {
          userId,
          workspaceId: null as unknown as string,
          projectId,
          categoryKey: "",
        },
      },
      update: baseFields,
      create: { ...baseFields, userId, workspaceId: null, projectId, categoryKey: "" },
    });
  }

  await invalidate(keys.project(userId, projectId));
  logger.debug("Preference writer: project prefs updated", { userId, projectId });
}

// -----------------------------------------------------------------------------
// Update conversation-scoped preferences
// -----------------------------------------------------------------------------

export async function updateConversation(
  userId:         string,
  conversationId: string,
  input: {
    mode?:         ConversationNotifMode;
    muteUntil?:    Date | null;
    pushEnabled?:  boolean | null;
    emailEnabled?: boolean | null;
  }
): Promise<void> {
  await db.conversationNotificationPreference.upsert({
    where:  { userId_conversationId: { userId, conversationId } },
    update: {
      ...(input.mode        !== undefined && { mode: input.mode }),
      ...(input.muteUntil   !== undefined && { muteUntil: input.muteUntil }),
      ...(input.pushEnabled  !== undefined && { pushEnabled: input.pushEnabled }),
      ...(input.emailEnabled !== undefined && { emailEnabled: input.emailEnabled }),
    },
    create: {
      userId,
      conversationId,
      mode:         input.mode        ?? "ALL_MESSAGES",
      muteUntil:    input.muteUntil   ?? null,
      pushEnabled:  input.pushEnabled  ?? null,
      emailEnabled: input.emailEnabled ?? null,
    },
  });

  await invalidate(keys.conversation(userId, conversationId));
  logger.debug("Preference writer: conversation prefs updated", { userId, conversationId });
}
