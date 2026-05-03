/**
 * seedProjectDefaults — seeds default resources for a newly created project.
 *
 * Runs AFTER insertProject in a single $transaction. Guard-checked with count
 * queries before each group — safe to retry and idempotent.
 *
 * Resources created:
 *   1. #general ChatConversation (type = CHANNEL)
 *   2. Default Whiteboard ("Project Board")
 *   3. 7 system IssueStatus columns (Kanban board)
 *   4. 4 root VaultFolder entries (Documents, Assets, Designs, Miscellaneous)
 *
 * NOTE: welcome ChatMessage is intentionally skipped — ChatMessage requires
 * ULID + streamId + sequence fields managed by the chat engine's outbox pipeline.
 * The channel creation alone is sufficient to bootstrap the chat section.
 */
import type { PrismaClient } from "@prisma/client";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("project:services:seed-project-defaults");

// ── Issue Kanban columns ───────────────────────────────────────────────────────

const DEFAULT_STATUSES: Array<{
  name: string;
  color: string;
  icon: string;
  position: number;
}> = [
  { name: "Backlog",     color: "#6B7280", icon: "circle-dashed", position: 0 },
  { name: "Todo",        color: "#3B82F6", icon: "circle",        position: 1 },
  { name: "In Progress", color: "#F59E0B", icon: "loader-circle", position: 2 },
  { name: "In Review",   color: "#8B5CF6", icon: "eye",           position: 3 },
  { name: "Done",        color: "#10B981", icon: "check-circle",  position: 4 },
  { name: "Canceled",    color: "#EF4444", icon: "x-circle",      position: 5 },
  { name: "Duplicate",   color: "#9CA3AF", icon: "copy",          position: 6 },
];

// ── Vault root folders ─────────────────────────────────────────────────────────

const DEFAULT_VAULT_FOLDERS = [
  "Documents",
  "Assets",
  "Designs",
  "Miscellaneous",
];

// ── Main ───────────────────────────────────────────────────────────────────────

export async function seedProjectDefaults(
  projectId: string,
  workspaceId: string,
  userId: string,
  db: PrismaClient
): Promise<void> {
  await db.$transaction(async (tx) => {
    // 1. #general channel
    const existingChannel = await tx.chatConversation.count({
      where: { projectId, type: "CHANNEL" },
    });
    if (existingChannel === 0) {
      await tx.chatConversation.create({
        data: {
          workspaceId,
          projectId,
          name: "general",
          topic: "General discussion for the project team.",
          type: "CHANNEL",
          members: {
            create: [{ userId }],
          },
        },
      });
      logger.debug("Seeded #general channel", { projectId });
    }

    // 2. Default whiteboard
    const existingBoard = await tx.whiteboard.count({ where: { projectId } });
    if (existingBoard === 0) {
      await tx.whiteboard.create({
        data: {
          workspaceId,
          projectId,
          title: "Project Board",
          description: "A shared whiteboard for visual collaboration.",
          createdBy: userId,
          s3Key: "",
          collaborators: {
            create: [{ userId }],
          },
        },
      });
      logger.debug("Seeded default whiteboard", { projectId });
    }

    // 3. Issue Kanban columns (system = cannot be deleted)
    const existingStatuses = await tx.issueStatus.count({
      where: { projectId, isSystem: true },
    });
    if (existingStatuses === 0) {
      await tx.issueStatus.createMany({
        data: DEFAULT_STATUSES.map((s) => ({ ...s, projectId, isSystem: true })),
        skipDuplicates: true,
      });
      logger.debug("Seeded issue status columns", { projectId, count: DEFAULT_STATUSES.length });
    }

    // 4. Vault root folders
    const existingFolders = await tx.vaultFolder.count({
      where: { projectId, isSystem: true, parentFolderId: null },
    });
    if (existingFolders === 0) {
      await tx.vaultFolder.createMany({
        data: DEFAULT_VAULT_FOLDERS.map((name) => ({
          name,
          projectId,
          parentFolderId: null,
          isSystem: true,
        })),
        skipDuplicates: true,
      });
      logger.debug("Seeded vault folders", { projectId, folders: DEFAULT_VAULT_FOLDERS });
    }

    // 5. Default page ("Getting Started")
    const existingPages = await tx.page.count({ where: { projectId } });
    if (existingPages === 0) {
      await tx.page.create({
        data: {
          workspaceId,
          projectId,
          title: "Getting Started",
          emojiIcon: "📒",
          position: 0,
          createdBy: userId,
          collaborators: {
            create: [{ userId, role: "EDITOR" }],
          },
        },
      });
      logger.debug("Seeded default page", { projectId });
    }
  });
}
