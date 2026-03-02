/**
 * Issues — Fractional Index Position Utilities
 *
 * Used for drag-and-drop ordering of issues within a column and columns
 * on the board. Midpoint insertion allows O(1) reorder without renumbering.
 *
 * Rebalance runs when precision degrades below a safe threshold.
 */

import type { PrismaClient } from "@prisma/client";

// ── Midpoint Calculation ──────────────────────────────────────────────────────

/**
 * Calculates the fractional index midpoint between two positions.
 *
 * Rules:
 *  - Insert at start  (before=null, after=X) → X / 2
 *  - Insert at end    (before=X, after=null)  → X + 1.0
 *  - Insert between   (before=A, after=B)     → (A + B) / 2
 *  - Empty column     (before=null, after=null)→ 1.0
 */
export function calculateMidpoint(
  before: number | null,
  after: number | null
): number {
  if (before === null && after === null) return 1.0;
  if (before === null) return after! / 2;
  if (after === null) return before + 1.0;
  return (before + after) / 2;
}

/**
 * The minimum gap between two adjacent position values before rebalancing
 * is triggered. Below this threshold floats lose enough precision that
 * ordering can become unreliable.
 */
const REBALANCE_THRESHOLD = 1e-9;

/**
 * Checks if two neighboring positions are too close for safe float arithmetic.
 */
export function needsRebalance(before: number, after: number): boolean {
  return Math.abs(after - before) < REBALANCE_THRESHOLD;
}

// ── Rebalance ─────────────────────────────────────────────────────────────────

/**
 * Renormalises all issue positions within a status column.
 * Assigns evenly-spaced positions (1.0, 2.0, 3.0, …) preserving the
 * current sort order (existing priority + position).
 *
 * Called only when float precision degrades; not on every reorder.
 */
export async function rebalanceIssuePositions(
  statusId: string,
  db: PrismaClient
): Promise<void> {
  const issues = await db.issue.findMany({
    where: { statusId, deletedAt: null },
    orderBy: [{ priority: "asc" }, { position: "asc" }],
    select: { id: true },
  });

  await db.$transaction(
    issues.map((issue, index) =>
      db.issue.update({
        where: { id: issue.id },
        data: { position: index + 1.0 },
      })
    )
  );
}

/**
 * Renormalises all column positions within a project.
 * Called rarely — only when column drag precision degrades.
 */
export async function rebalanceStatusPositions(
  projectId: string,
  db: PrismaClient
): Promise<void> {
  const statuses = await db.issueStatus.findMany({
    where: { projectId, deletedAt: null },
    orderBy: { position: "asc" },
    select: { id: true },
  });

  await db.$transaction(
    statuses.map((status, index) =>
      db.issueStatus.update({
        where: { id: status.id },
        data: { position: index + 1.0 },
      })
    )
  );
}
