/**
 * Issues Module — Hard Limits & Constants
 */

// ── Description Size Limits ───────────────────────────────────────────────────

export const ISSUE_LIMITS = {
  /** Max bytes for a BlockNote JSON description (2 MB) */
  MAX_DESCRIPTION_SIZE_BYTES: 2 * 1024 * 1024,
} as const;

// ── S3 TTLs ───────────────────────────────────────────────────────────────────

export const ISSUE_S3 = {
  /** Presigned PUT URL TTL (seconds) — 15 minutes */
  PRESIGNED_PUT_TTL_SECONDS: 900,

  /** Presigned GET URL TTL (seconds) — 5 minutes */
  PRESIGNED_GET_TTL_SECONDS: 300,
} as const;

// ── Default Statuses (seeded on project creation) ────────────────────────────

export const DEFAULT_ISSUE_STATUSES = [
  {
    name: "Backlog",
    color: "#6B7280",
    icon: "circle-dashed",
    position: 0.0,
    isSystem: true,
  },
  {
    name: "Todo",
    color: "#6B7280",
    icon: "circle",
    position: 1.0,
    isSystem: true,
  },
  {
    name: "In Progress",
    color: "#F59E0B",
    icon: "loader-circle",
    position: 2.0,
    isSystem: true,
  },
  {
    name: "In Review",
    color: "#3B82F6",
    icon: "circle-dot",
    position: 3.0,
    isSystem: true,
  },
  {
    name: "Done",
    color: "#10B981",
    icon: "check-circle",
    position: 4.0,
    isSystem: true,
  },
  {
    name: "Canceled",
    color: "#EF4444",
    icon: "x-circle",
    position: 5.0,
    isSystem: true,
  },
] as const;
