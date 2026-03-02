/**
 * Issues — Seed Default Statuses
 *
 * Called once when a new Project is created. Inserts the 6 system Kanban
 * columns so every project always starts with a usable board.
 *
 * System statuses cannot be deleted by users (checked in delete-issue-status).
 */

import type { PrismaClient } from "@prisma/client";
import { DEFAULT_ISSUE_STATUSES } from "./constants";

export async function seedDefaultIssueStatuses(
  projectId: string,
  db: PrismaClient
): Promise<void> {
  await db.issueStatus.createMany({
    data: DEFAULT_ISSUE_STATUSES.map((s) => ({
      projectId,
      name: s.name,
      color: s.color,
      icon: s.icon,
      position: s.position,
      isSystem: s.isSystem,
    })),
    skipDuplicates: true, // idempotent re-runs during retries
  });
}
